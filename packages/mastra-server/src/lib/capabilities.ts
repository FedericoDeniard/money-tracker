import type { UserRole } from "./roles";

/**
 * Capability vocabulary. Mirrors
 * `supabase/functions/_shared/capabilities.ts` and
 * `packages/frontend/src/lib/capabilities.ts`. The CHECK constraint on
 * `payments.plan_capabilities.capability` is the authoritative guard
 * against drift between these copies.
 *
 * Capabilities are a subscription-tier concept: a user has a capability
 * if any active subscription's plan grants it. Active statuses mirror
 * the WHERE clause in
 * `supabase/migrations/20260705031217_add_user_capabilities_to_jwt.sql`
 * so this helper and the JWT claim agree on what counts as "active".
 */
export const CAPABILITIES = {
  gmail_sync: "gmail_sync",
  ai_assistant: "ai_assistant",
  push_notifications: "push_notifications",
  advanced_reports: "advanced_reports",
  process_documents: "process_documents",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/**
 * Type guard for runtime values (e.g. read from the JWT claim).
 */
export function isCapability(x: unknown): x is Capability {
  return typeof x === "string" && x in CAPABILITIES;
}

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
 * the DB roundtrip; the call site logs the bypass at info level so
 * observers can tell when a feature was granted via staff role vs.
 * via subscription.
 *
 * Mirror this list in `supabase/functions/_shared/capabilities.ts`.
 */
const ROLE_BYPASS: ReadonlySet<UserRole> = new Set<UserRole>([
  "admin",
  "tester",
]);

/**
 * Server-side capability gate for the mastra-server. Always re-queries
 * `payments.subscriptions` joined with `payments.plan_capabilities` so
 * the gate reflects subscription state changes immediately, without
 * waiting for a JWT refresh — same contract as
 * `supabase/functions/_shared/capabilities.ts#requireCapability`.
 *
 * Returns `{ allowed: true }` when the caller has the capability on
 * any active subscription (or when their role is in the bypass set);
 * `{ allowed: false, missing: capability }` otherwise. The caller
 * decides how to surface a denial (the chat handler in
 * `routes/resilient-chat-route.ts` returns a 403 with the same
 * `Requires capability: <key>` prefix the frontend classifier
 * matches against, so the user sees the localized "premium feature"
 * toast via `getEdgeFunctionErrorMessage`).
 *
 * The mirror of this helper in the supabase edge functions uses the
 * service-role Supabase client; the mastra-server uses a per-request
 * client scoped to the caller's JWT (built from `supabaseToken` in
 * the request context) so RLS still applies and we don't need
 * service-role credentials in this package.
 */
export interface CapabilityCheckOk {
  allowed: true;
}

export interface CapabilityCheckDenied {
  allowed: false;
  missing: Capability;
}

export type CapabilityCheck = CapabilityCheckOk | CapabilityCheckDenied;

export interface RequireCapabilityContext {
  userId: string;
  supabaseToken: string;
  role: UserRole;
}

export async function requireCapability(
  ctx: RequireCapabilityContext,
  capability: Capability
): Promise<CapabilityCheck> {
  if (ROLE_BYPASS.has(ctx.role)) {
    console.info(
      `[requireCapability] role bypass for ${capability} by ${ctx.role} (user ${ctx.userId})`
    );
    return { allowed: true };
  }

  // The supabase client lives in the lib directory and is created
  // from the caller's JWT — same pattern as
  // `lib/supabase-from-token.ts` which the tools already use.
  const { supabaseFromToken } = await import("./supabase-from-token");
  const supabase = supabaseFromToken(ctx.supabaseToken);

  const { data, error } = await supabase
    .schema("payments")
    .from("subscriptions")
    .select(
      "status, plan:plans(plan_capabilities(capability))"
    )
    .eq("user_id", ctx.userId)
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES])
    .maybeSingle();

  if (error) {
    // Treat DB errors as "not allowed" so the caller surfaces the
    // premium-feature UX instead of a confusing internal error. The
    // route handler logs the underlying error.
    console.error(
      `[requireCapability] db error checking ${capability}:`,
      error
    );
    return { allowed: false, missing: capability };
  }

  // PostgREST can only infer joins from foreign keys; there is no
  // direct FK between `subscriptions` and `plan_capabilities` so we
  // nest through `plans`. The supabase-js generated type for the
  // response shape is finicky for this kind of double-nested select
  // (it inferred `data.plan` as an array), so we cast to the shape
  // we actually expect.
  type Nested = {
    status: string;
    plan: { plan_capabilities: Array<{ capability: string }> } | null;
  };
  const nested = data as unknown as Nested | null;
  const nestedCaps =
    nested?.plan?.plan_capabilities.map((row) => row.capability) ?? [];
  if (!nestedCaps.includes(capability)) {
    return { allowed: false, missing: capability };
  }

  return { allowed: true };
}