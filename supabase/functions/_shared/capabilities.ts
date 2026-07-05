import type { User } from "jsr:@supabase/supabase-js@2";
import { supabase } from "./lib/supabase.ts";
import { isCapability, type UserRole } from "./features.ts";

type JsonHeaders = Record<string, string>;

/**
 * Capability vocabulary. Mirrors packages/frontend/src/lib/capabilities.ts
 * and packages/mastra-server/src/lib/capabilities.ts. The CHECK constraint
 * on payments.plan_capabilities.capability (see
 * supabase/migrations/20260705031212_add_plan_capabilities.sql) is the
 * authoritative guard against drift between these copies.
 */
export const CAPABILITIES = {
  gmail_sync: "gmail_sync",
  ai_assistant: "ai_assistant",
  push_notifications: "push_notifications",
  advanced_reports: "advanced_reports",
  process_documents: "process_documents",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

// isCapability is re-exported below so existing imports from this module
// keep working. The implementation lives in features.ts so all three
// copies (edge, frontend, mastra) share the same check.

/**
 * Statuses that grant entitlements. A user with a subscription in any of
 * these statuses keeps their capabilities until the status leaves the set
 * (e.g. via a webhook updating `cancelled` or `payment_failed`). Kept in
 * sync with the WHERE clause in
 * supabase/migrations/20260705031217_add_user_capabilities_to_jwt.sql so
 * the JWT hint and the security boundary agree on what counts as "active".
 */
const ACTIVE_SUBSCRIPTION_STATUSES = [
  "authorized",
  "pending",
  "paused",
  "pending_cancellation",
] as const;

/**
 * Roles that bypass capability gates entirely. Staff (`admin`) and
 * developers running the app as `tester` can exercise any gated feature
 * without holding an active subscription. The bypass short-circuits
 * the DB roundtrip and logs an info-level audit entry so observers can
 * tell when a feature was granted via staff role vs. via subscription.
 *
 * Mirror this list in `packages/mastra-server/src/lib/capabilities.ts`.
 */
const ROLE_BYPASS: ReadonlySet<UserRole> = new Set<UserRole>([
  "admin",
  "tester",
]);

function forbidden(corsHeaders: JsonHeaders, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function internalError(corsHeaders: JsonHeaders): Response {
  return new Response(
    JSON.stringify({ error: "Failed to verify capabilities" }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Security boundary for capability-gated edge functions.
 *
 * Returns `{ user }` if the caller has the capability on any active
 * subscription OR as a default grant; returns a 403 Response otherwise.
 *
 * Always re-queries `payments.user_capabilities_v`. We do **not** trust
 * the JWT `user_capabilities` claim here: the claim is a UI hint (so
 * the frontend can hide buttons without a roundtrip) but it is baked
 * into the access token until it expires, so a subscription that cancels
 * would still appear active until the next refresh. By querying the
 * DB on every call, the next gated call after a status change
 * immediately gets the right answer.
 *
 * The view (`payments.user_capabilities_v`) is a UNION of two sources:
 *   - capability grants from the user's active subscriptions, and
 *   - the default capabilities in `payments.default_capabilities`
 *     (rows with `user_id = null`).
 * The query filters with `.or(user_id.eq.<uuid>, user_id.is.null)` so
 * a single roundtrip returns both the user's specific grants and the
 * defaults that apply to everyone.
 *
 * Role bypass: callers whose `role` is `admin` or `tester` skip the DB
 * check entirely. Staff and developers can exercise any gated feature
 * without holding a subscription; the bypass is logged at info level
 * so observability can distinguish staff-granted access from
 * subscription-granted access.
 */
export async function requireCapability(
  ctx: { user: User; role: UserRole },
  capability: Capability,
  corsHeaders: JsonHeaders
): Promise<{ user: User } | Response> {
  if (ROLE_BYPASS.has(ctx.role)) {
    console.info(
      `[requireCapability] role bypass for ${capability} by ${ctx.role} (user ${ctx.user.id})`
    );
    return { user: ctx.user };
  }

  const { data, error } = await supabase
    .schema("payments")
    .from("user_capabilities_v")
    .select("capability")
    .or(`user_id.eq.${ctx.user.id},user_id.is.null`);

  if (error) {
    console.error(
      `[requireCapability] db error checking ${capability}:`,
      error
    );
    return internalError(corsHeaders);
  }

  const caps = (data ?? []).map(row => row.capability).filter(isCapability);
  if (!caps.includes(capability)) {
    return forbidden(corsHeaders, `Requires capability: ${capability}`);
  }

  return { user: ctx.user };
}

/**
 * Convenience helper for callers that want the set of capabilities
 * (e.g. to branch on multiple capabilities without gating). Returns
 * the deduplicated union of the user's active subscription grants and
 * the default grants, sourced from the same `payments.user_capabilities_v`
 * view as `requireCapability`.
 *
 * Role bypass: callers with `role: admin` or `role: tester` receive
 * the full CAPABILITIES enum (every capability), since they bypass the
 * subscription + default gate in `requireCapability` too. A tool that
 * branches on `hasCapability("advanced_reports")` keeps working for
 * staff even without a subscription row.
 */
export async function getUserCapabilities(
  userId: string,
  role: UserRole
): Promise<Capability[]> {
  if (ROLE_BYPASS.has(role)) {
    return Object.values(CAPABILITIES);
  }

  const { data, error } = await supabase
    .schema("payments")
    .from("user_capabilities_v")
    .select("capability")
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) {
    console.error("[getUserCapabilities] db error:", error);
    return [];
  }

  const caps = new Set<Capability>();
  for (const row of data ?? []) {
    if (isCapability(row.capability)) {
      caps.add(row.capability);
    }
  }
  return [...caps];
}

// isCapability is defined in features.ts and re-exported here so callers
// of this module don't need to know about the split.
export { isCapability };
