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
 * subscription; returns a 403 Response otherwise.
 *
 * Always re-queries `payments.subscriptions` joined with
 * `payments.plan_capabilities`. We do **not** trust the JWT
 * `user_capabilities` claim here: the claim is a UI hint (so the
 * frontend can hide buttons without a roundtrip) but it is baked into
 * the access token until it expires, so a subscription that cancels
 * would still appear active until the next refresh. By querying the
 * DB on every call, the next gated call after a status change
 * immediately gets the right answer.
 *
 * The join path is explicit because PostgREST can only infer
 * relationships from foreign keys. There is no direct FK between
 * `payments.subscriptions` and `payments.plan_capabilities` — both
 * reference `payments.plans` — so we nest through `plan:plans(...)
 * and the `!inner` modifier guarantees a row is only returned if the
 * subscription has an active plan that has any capability grants.
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
    .from("subscriptions")
    .select(
      "status, plan:plans(plan_capabilities!inner(capability))"
    )
    .eq("user_id", ctx.user.id)
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES])
    .maybeSingle();

  if (error) {
    console.error(
      `[requireCapability] db error checking ${capability}:`,
      error
    );
    return internalError(corsHeaders);
  }

  // Nested response: data.plan is null when no active subscription
  // matched; otherwise data.plan.plan_capabilities is the array of
  // grants for that plan. The supabase-js generated type for the
  // response shape is finicky for this kind of double-nested select
  // (it inferred `data.plan` as an array), so we cast to the shape
  // we actually expect.
  type Nested = {
    status: string;
    plan: { plan_capabilities: Array<{ capability: string }> } | null;
  };
  const nested = data as unknown as Nested | null;
  const nestedCaps =
    nested?.plan?.plan_capabilities.map(row => row.capability) ?? [];
  if (!nestedCaps.includes(capability)) {
    return forbidden(corsHeaders, `Requires capability: ${capability}`);
  }

  return { user: ctx.user };
}

/**
 * Convenience helper for callers that want the set of capabilities
 * (e.g. to branch on multiple capabilities without gating). Returns a
 * deduplicated union across all active subscriptions.
 *
 * Same join path as `requireCapability` (nested through plans) because
 * of the missing direct FK between subscriptions and plan_capabilities.
 *
 * Role bypass: callers with `role: admin` or `role: tester` receive
 * the full CAPABILITIES enum (every capability), since they bypass the
 * subscription gate in `requireCapability` too. A tool that branches
 * on `hasCapability("advanced_reports")` keeps working for staff even
 * without a subscription row.
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
    .from("subscriptions")
    .select("plan:plans(plan_capabilities!inner(capability))")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES]);

  if (error) {
    console.error("[getUserCapabilities] db error:", error);
    return [];
  }

  type NestedRow = {
    plan: { plan_capabilities: Array<{ capability: string }> } | null;
  };
  const nested = (data ?? []) as unknown as NestedRow[];
  const caps = new Set<Capability>();
  for (const row of nested) {
    for (const pc of row.plan?.plan_capabilities ?? []) {
      if (isCapability(pc.capability)) {
        caps.add(pc.capability);
      }
    }
  }
  return [...caps];
}

// isCapability is defined in features.ts and re-exported here so callers
// of this module don't need to know about the split.
export { isCapability };
