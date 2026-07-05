import type { User } from "jsr:@supabase/supabase-js@2";
import { supabase } from "./lib/supabase.ts";

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

/**
 * Type guard for runtime values (e.g. read from the JWT claim).
 */
export function isCapability(x: unknown): x is Capability {
  return typeof x === "string" && x in CAPABILITIES;
}

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
 * The relationship name `plan_capabilities` resolves through PostgREST's
 * foreign-key detection (capabilities.plan_id → plans.id → subscriptions.plan_id).
 */
export async function requireCapability(
  ctx: { user: User },
  capability: Capability,
  corsHeaders: JsonHeaders
): Promise<{ user: User } | Response> {
  const { data, error } = await supabase
    .schema("payments")
    .from("subscriptions")
    .select("status, plan_capabilities!inner(capability)")
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

  const caps = (data?.plan_capabilities ?? []).map(row => row.capability) ?? [];
  if (!caps.includes(capability)) {
    return forbidden(corsHeaders, `Requires capability: ${capability}`);
  }

  return { user: ctx.user };
}

/**
 * Convenience helper for callers that want the set of capabilities
 * (e.g. to branch on multiple capabilities without gating). Returns a
 * deduplicated union across all active subscriptions.
 */
export async function getUserCapabilities(
  userId: string
): Promise<Capability[]> {
  const { data, error } = await supabase
    .schema("payments")
    .from("subscriptions")
    .select("plan_capabilities!inner(capability)")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_SUBSCRIPTION_STATUSES]);

  if (error) {
    console.error("[getUserCapabilities] db error:", error);
    return [];
  }

  const caps = new Set<Capability>();
  for (const row of data ?? []) {
    for (const pc of row.plan_capabilities ?? []) {
      if (isCapability(pc.capability)) {
        caps.add(pc.capability);
      }
    }
  }
  return [...caps];
}
