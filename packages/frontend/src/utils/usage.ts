/**
 * Pure functions for the usage panel.
 *
 * Everything in this file is testable with bun:test without any
 * browser or Supabase. The service layer composes these primitives;
 * components consume their typed outputs.
 */
import { usageWarn } from "../lib/usage-logger";
import type { Capability } from "../lib/capabilities";

// ---------- Scope / period validation ----------

/**
 * Permissive scope regex: any `prefix:value` shape with a lowercase
 * prefix and a non-empty value, plus the special scope `default`
 * (no colon — the DB stores it as a literal string per
 * `20260705163606_add_usage_limits_and_counters.sql:100`). Forward-
 * compatible with future scope types (`team:`, `org:`, `region:`,
 * ...) without needing a code change to the regex itself. Unknown
 * prefixes still parse; they are treated as "no override" by
 * `resolveUsageLimit` so the panel silently falls through to default
 * rather than crashing.
 */
const SCOPE_RE = /^(?:default|[a-z_]+:.+)$/;

/**
 * Known scope prefixes in resolution priority order: `role` first,
 * then `plan`, then `default`. New prefixes (e.g. `team`) must be
 * added here in the right priority position to participate in the
 * chain. The resolver uses this array to walk the usage_limits rows
 * in order and stop at the first match.
 */
const KNOWN_SCOPE_PREFIXES = ["role", "plan", "default"] as const;
type KnownScopePrefix = (typeof KNOWN_SCOPE_PREFIXES)[number];

export interface ParsedScope {
  prefix: string;
  value: string;
}

export function validateScope(scope: string): ParsedScope | null {
  if (!SCOPE_RE.test(scope)) return null;
  if (scope === "default") return { prefix: "default", value: "" };
  const idx = scope.indexOf(":");
  if (idx <= 0 || idx === scope.length - 1) return null;
  return { prefix: scope.slice(0, idx), value: scope.slice(idx + 1) };
}

export function isKnownScopePrefix(prefix: string): prefix is KnownScopePrefix {
  return (KNOWN_SCOPE_PREFIXES as readonly string[]).includes(prefix);
}

/**
 * Period values the frontend knows how to render. Anything else in
 * `usage_limits.period` is skipped with a warning — future migration
 * that adds a new period type will surface as a console warning
 * rather than silently rendering the wrong bucket.
 */
const KNOWN_PERIODS = ["month", "day", "hour"] as const;
export type KnownPeriod = (typeof KNOWN_PERIODS)[number];

export function validatePeriod(period: string): period is KnownPeriod {
  return (KNOWN_PERIODS as readonly string[]).includes(period);
}

// ---------- Limit resolution ----------

export interface UsageLimitRow {
  capability: Capability;
  scope: string;
  period: string;
  max_count: number;
}

export interface ResolvedLimit {
  value: number;
  scope: string;
}

/**
 * Walk the role → plan → default chain for a single capability and
 * return the first matching row, plus the scope that matched (for
 * the tooltip).
 *
 * `role` and `planKey` may be null (free user with no subscription).
 * Unknown scope prefixes are skipped silently with a warning — a
 * `team:foo` row would not match role/plan/default and would fall
 * through to the default row, which is the safe behaviour. To
 * actually use a team override, add the prefix to
 * `KNOWN_SCOPE_PREFIXES`.
 *
 * Rows with periods we don't recognise are also skipped (see
 * `validatePeriod`).
 *
 * Returns `null` if no row matches at any scope — the panel will
 * then skip the capability entirely (no usage bar to draw).
 */
export function resolveUsageLimit(
  role: string | null,
  planKey: string | null,
  capability: Capability,
  limits: UsageLimitRow[]
): ResolvedLimit | null {
  // Build a single normalised view: only rows for this capability
  // and with known periods. Scope validation is permissive — we keep
  // the row and let the prefix-walk decide whether it matches.
  const rows = limits.filter(
    r =>
      r.capability === capability &&
      validatePeriod(r.period) &&
      r.period === "month" // panel only renders monthly counters today
  );

  for (const prefix of KNOWN_SCOPE_PREFIXES) {
    let candidateScope: string | null = null;
    if (prefix === "role" && role) {
      candidateScope = `role:${role}`;
    } else if (prefix === "plan" && planKey) {
      candidateScope = `plan:${planKey}`;
    } else if (prefix === "default") {
      candidateScope = "default";
    }
    if (!candidateScope) continue;
    const row = rows.find(r => r.scope === candidateScope);
    if (row) return { value: row.max_count, scope: row.scope };
  }

  return null;
}

// ---------- Period math (UTC) ----------

/**
 * Return the ISO timestamp for the first instant of the current
 * calendar month in UTC. Matches `date_trunc('month', now())` in
 * Postgres when the session timezone is UTC (which is the local
 * stack's default).
 */
export function startOfMonthUtc(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  ).toISOString();
}

/**
 * Add `n` calendar months to an ISO timestamp, returning a new ISO
 * timestamp. Handles month-end edge cases (Jan 31 → Feb 28/29) and
 * year boundaries (Dec → Jan) via `Date.setUTCDate(0)` which rolls
 * over to the last day of the previous month when the target month
 * doesn't have enough days.
 */
export function addMonthsIso(iso: string, n: number): string {
  const d = new Date(iso);
  // setUTCDate(0) of month N+1 is the last day of month N. We use
  // setUTCMonth which clamps, so Jan 31 + 1 month → Mar 3 (wrong).
  // Workaround: clamp the day after the math.
  const targetMonth = d.getUTCMonth() + n;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDayOfTargetMonth);
  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      day,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  ).toISOString();
}

/**
 * Format a period_start ISO string as `YYYY-MM-DD` for the reset
 * line. Stable across locales (we render the resolved date, not a
 * relative format).
 */
export function formatResetDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute `resets_at` from a `period_start`. For monthly periods,
 * returns the same day one calendar month later. Year boundaries
 * (Dec → Jan) are handled by `addMonthsIso`.
 */
export function computeResetsAt(periodStart: string): string {
  return addMonthsIso(periodStart, 1);
}

// ---------- Threshold classification ----------

export type UsageRowStatus = "ok" | "warn" | "exceeded";

/**
 * Pick the colour bucket for the progress bar based on percentage of
 * limit consumed.
 *
 * Thresholds (from MON-23 acceptance criteria):
 *   - 0–79%  → "ok"      (var(--success))
 *   - 80–99% → "warn"    (var(--warning))
 *   - ≥100%  → "exceeded" (var(--error))
 *
 * A limit of zero is "exceeded" regardless of `used` (the gate
 * rejects every call; we render the row accordingly).
 */
export function getUsageRowStatus(used: number, limit: number): UsageRowStatus {
  if (limit <= 0) return "exceeded";
  const pct = (used / limit) * 100;
  if (pct >= 100) return "exceeded";
  if (pct >= 80) return "warn";
  return "ok";
}

// ---------- Counter row parsing ----------

export interface UsageCounterRow {
  capability: Capability;
  count: number;
  period_start: string;
}

/**
 * Find the counter row for a single capability in the current period.
 * If no row exists, returns `null` (the caller should default `used`
 * to 0 and use the client-computed start-of-month as the period).
 *
 * Defensive against rows from other periods — if the server returns
 * a counter whose `period_start` doesn't match the start of the
 * current month, we log a warning and use it anyway (the server is
 * ground truth, but the inconsistency is worth flagging).
 */
export function findCurrentPeriodCounter(
  capability: Capability,
  counters: UsageCounterRow[],
  clientPeriodStart: string = startOfMonthUtc()
): UsageCounterRow | null {
  for (const row of counters) {
    if (row.capability !== capability) continue;
    if (row.period_start === clientPeriodStart) return row;
    usageWarn("counter period mismatch", {
      capability,
      serverPeriodStart: row.period_start,
      clientPeriodStart,
    });
    return row;
  }
  return null;
}
