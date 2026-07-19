/**
 * Typed wrappers for the three RPCs in the `payments` schema:
 *
 *   - `payments.user_capabilities(uuid)`
 *   - `payments.resolve_usage_limit(uuid, text, text)`
 *   - `payments.check_and_increment_usage(uuid, text, text)`
 *
 * The PostgREST discovery quirk documented at
 * `supabase/migrations/20260705163606_add_usage_limits_and_counters.sql:316-326`
 * means callers MUST send `Accept-Profile: payments` for these to
 * resolve. `supabase.schema("payments").rpc(...)` does that for us;
 * we centralise it here so the only place that has to know about the
 * profile header is this file. Tests can mock the wrappers instead of
 * faking the entire Supabase chain.
 *
 * All wrappers:
 *   - return `null` (not throw) on transport errors, and log with
 *     the `[payments-rpc]` prefix. Caller decides how to surface
 *     (toast, retry button, fallback). The pattern matches the
 *     fail-open convention used by the increment RPC at the server
 *     call sites (`process-document/index.ts`, `chat-route.ts`,
 *     `export-report-pdf/index.ts`).
 *   - return the raw typed shape from `database.types.ts`, so any
 *     drift between the DB signature and our expectations fails at
 *     `bun run typecheck` rather than at runtime.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { getSupabase } from "./supabase";
import { isCapability, type Capability } from "./capabilities";

type RpcClient = SupabaseClient<Database>;

type DbCapability = Database["payments"]["Enums"]["capability"];

/**
 * Returns the union of capabilities granted to a user via active
 * subscription + default grants. SECURITY DEFINER on the server side;
 * we just call it.
 *
 * Returns `null` on RPC error. Filters out any value not present in
 * the frontend's `isCapability` guard — the RPC could in principle
 * return an enum value the frontend doesn't know about (drift) and
 * we want to ignore those rather than propagate them to a UI branch.
 *
 * `client` is optional and is provided for tests; production code
 * calls without it and lets the wrapper resolve `getSupabase()`.
 */
export async function getUserCapabilitiesRpc(
  userId: string,
  client?: RpcClient
): Promise<Capability[] | null> {
  const c = client ?? (await getSupabase());
  const { data, error } = await c
    .schema("payments")
    .rpc("user_capabilities", { target_user_id: userId });
  if (error) {
    console.error(
      `[payments-rpc] user_capabilities failed for ${userId}:`,
      error
    );
    return null;
  }
  const arr = (data ?? []) as DbCapability[];
  return arr.filter(isCapability);
}

/**
 * Resolves the per-period limit for a (user, capability) pair. Mirrors
 * the server-side `resolve_usage_limit` chain (role → plan → default).
 *
 * Returns `null` on RPC error. Returns `0` (an allowed value) if the
 * server reports no limit configured.
 */
export async function resolveUsageLimitRpc(
  userId: string,
  cap: Capability,
  periodKind: "month" | "day" = "month",
  client?: RpcClient
): Promise<number | null> {
  const c = client ?? (await getSupabase());
  const { data, error } = await c
    .schema("payments")
    .rpc("resolve_usage_limit", {
      target_user_id: userId,
      cap,
      period_kind: periodKind,
    });
  if (error) {
    console.error(
      `[payments-rpc] resolve_usage_limit failed for ${userId}/${cap}:`,
      error
    );
    return null;
  }
  // The RPC returns a single int (not a table). postgrest-js types it
  // as `unknown`; we narrow.
  return typeof data === "number" ? data : Number(data ?? 0);
}
