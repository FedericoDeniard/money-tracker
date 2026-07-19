/**
 * Service layer for the usage panel.
 *
 * Reads three tables in parallel from the `payments` schema and one
 * row from the existing `paymentsService.getMySubscription`. Joins
 * client-side via `utils/usage.ts` resolvers so we don't need a new
 * RPC and don't hit the N+1 anti-pattern that the ticket originally
 * proposed.
 *
 * Drift handling:
 *   - capabilities out of the hand-rolled `CAPABILITIES` constant
 *     (drift from DB enum) are filtered via `isCapability`
 *   - usage_limits rows with unknown scope prefixes are silently
 *     skipped (logged via `usageWarn`)
 *   - usage_limits rows with unknown period values are skipped
 *   - usage_counters with a period_start that doesn't match the
 *     client-computed start-of-month are still used (server is
 *     ground truth) but logged
 *
 * Returns `[]` for `role === "admin"` because the panel is empty
 * for staff regardless of what counters they would otherwise see.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { getSupabase } from "../lib/supabase";
import { isCapability, type Capability } from "../lib/capabilities";
import {
  computeResetsAt,
  findCurrentPeriodCounter,
  resolveUsageLimit,
  startOfMonthUtc,
  type UsageCounterRow,
  type UsageLimitRow,
} from "../utils/usage";
import { usageWarn } from "../lib/usage-logger";
import { paymentsService, type MySubscription } from "./payments.service";

type DbClient = SupabaseClient<Database>;

export interface UsageRow {
  capability: Capability;
  used: number;
  limit: number;
  /**
   * Where the resolved limit came from — drives the tooltip copy.
   * `scopeKind` is the enum value; `scopeValue` is the qualifier
   * (e.g. "tester" for `role`, "lite_monthly" for `plan`), or null
   * for `default`.
   */
  scopeKind: "role" | "plan" | "default" | "team" | "org";
  scopeValue: string | null;
  /** ISO timestamp for the period start (server is ground truth). */
  periodStart: string;
  /** ISO timestamp one period later — what the reset line displays. */
  resetsAt: string;
  /** Was the counter found, or are we showing 0 because nothing has been counted yet this period? */
  hasCounter: boolean;
}

export interface ListForUserInput {
  userId: string;
  role: string | null;
  planKey: string | null;
  /**
   * Allow tests to inject a pre-fetched subscription row so we
   * don't hit the DB twice per call. Production callers omit this.
   */
  subscription?: MySubscription | null;
}

export const usageService = {
  async listForUser(input: ListForUserInput): Promise<UsageRow[]> {
    // Admin panel is empty by design — see ticket acceptance criteria.
    if (input.role === "admin") return [];

    const supabase = await getSupabase();
    const periodStartFilter = startOfMonthUtc();

    const subscription =
      input.subscription !== undefined
        ? input.subscription
        : await paymentsService.getMySubscription(input.userId);

    const [capabilities, counters, limits] = await Promise.all([
      fetchUserCapabilities(supabase, input.userId),
      fetchCurrentCounters(supabase, input.userId, periodStartFilter),
      fetchAllUsageLimits(supabase),
    ]);

    // Resolve the active plan key from the subscription row. The
    // status must be in the active set; otherwise the user has
    // effectively no paid plan and we fall through to default.
    const activePlanKey = input.planKey ?? pickActivePlanKey(subscription);

    const rows: UsageRow[] = [];
    for (const cap of capabilities) {
      const resolved = resolveUsageLimit(
        input.role,
        activePlanKey,
        cap,
        limits
      );
      if (!resolved) continue; // no usage_limits row at any scope
      const counter = findCurrentPeriodCounter(
        cap,
        counters,
        periodStartFilter
      );
      const used = counter?.count ?? 0;
      const periodStart = counter?.period_start ?? periodStartFilter;
      rows.push({
        capability: cap,
        used,
        limit: resolved.value,
        scopeKind: resolved.scopeKind,
        scopeValue: resolved.scopeValue,
        periodStart,
        resetsAt: computeResetsAt(periodStart),
        hasCounter: counter !== null,
      });
    }
    return rows;
  },
};

async function fetchUserCapabilities(
  supabase: DbClient,
  userId: string
): Promise<Capability[]> {
  // The `user_capabilities_v` view is revoked from authenticated
  // (see 20260705150533_add_user_capabilities_rpc.sql:124), so we
  // can't query it directly. The RPC is the public API.
  const { data, error } = await supabase
    .schema("payments")
    .rpc("user_capabilities", { target_user_id: userId });
  if (error) {
    usageWarn("user_capabilities RPC failed", { error: error.message });
    return [];
  }
  return (data ?? []).filter(isCapability);
}

async function fetchCurrentCounters(
  supabase: DbClient,
  userId: string,
  periodStart: string
): Promise<UsageCounterRow[]> {
  const { data, error } = await supabase
    .schema("payments")
    .from("usage_counters")
    .select("capability, count, period_start")
    .eq("user_id", userId)
    .gte("period_start", periodStart);
  if (error) {
    usageWarn("usage_counters fetch failed", { error: error.message });
    return [];
  }
  const rows = (data ?? []) as Array<{
    capability: string;
    count: number;
    period_start: string;
  }>;
  return rows.flatMap(row => {
    if (!isCapability(row.capability)) return [];
    return [
      {
        capability: row.capability,
        count: row.count,
        period_start: row.period_start,
      },
    ];
  });
}

async function fetchAllUsageLimits(
  supabase: DbClient
): Promise<UsageLimitRow[]> {
  // Read from the unified view `payments.usage_limits_v` which UNIONs
  // the three typed tables (role, plan, default). Same row shape as
  // the legacy polymorphic table — capability, scope_kind,
  // scope_value, period, max_count — so the rest of the pipeline
  // is unchanged. RLS on the underlying tables is enforced through
  // the view (security_invoker = true).
  const { data, error } = await supabase
    .schema("payments")
    .from("usage_limits_v")
    .select("capability, scope_kind, scope_value, period, max_count");
  if (error) {
    usageWarn("usage_limits_v fetch failed", { error: error.message });
    return [];
  }
  const rows = (data ?? []) as Array<{
    capability: string;
    scope_kind: string;
    scope_value: string | null;
    period: string;
    max_count: number;
  }>;
  return rows.flatMap(row => {
    if (!isCapability(row.capability)) return [];
    return [
      {
        capability: row.capability,
        scopeKind: row.scope_kind as UsageLimitRow["scopeKind"],
        scopeValue: row.scope_value,
        period: row.period as UsageLimitRow["period"],
        maxCount: row.max_count,
      },
    ];
  });
}

/**
 * Active statuses are the single source of truth in
 * `lib/subscription-status.ts`. We re-declare the set here to keep
 * the service self-contained (no extra import in a non-React file);
 * drift is caught by the runtime check that lives in the panel.
 * If a new status is added, update both this set AND the
 * subscription-status.ts ACTIVE_SUBSCRIPTION_STATUSES constant.
 */
function pickActivePlanKey(subscription: MySubscription | null): string | null {
  if (!subscription?.plan_id) return null;
  const activeStatuses = new Set([
    "authorized",
    "pending",
    "paused",
    "pending_cancellation",
  ]);
  if (!activeStatuses.has(subscription.status)) return null;
  return subscription.plan?.plan_key ?? null;
}
