/**
 * Wire-up for the `gmail_sync` usage counter inside the seed-emails
 * pipeline. The capability and the per-(capability, scope, period)
 * configuration are already in place:
 *
 *   - payments.capability enum value 'gmail_sync'
 *     (supabase/migrations/20260705031212_add_plan_capabilities.sql)
 *   - payments.usage_limits rows for role:tester=1000/month and
 *     default=100/month
 *     (supabase/migrations/20260705163606_add_usage_limits_and_counters.sql)
 *   - payments.check_and_increment_usage RPC
 *     (same migration; security definer, atomic upsert + rollback)
 *
 * What was missing was a call site in the per-email processor. The
 * three other wired-up call sites — process-document, chat, and
 * export-report-pdf — all live at the request boundary and count
 * before any AI work happens. seed-emails is different: it processes
 * a batch of messages asynchronously, each one independently, and we
 * want to count only the messages that actually produced a persisted
 * row (a transactions row OR a discarded_emails row). Otherwise we
 * would burn quota on emails that turned out to be SPAM, or failed
 * AI extraction, or were duplicates of an already-processed message.
 *
 * Idempotency: the caller is responsible for not calling this twice
 * for the same message. Today the processor's `findExistingTransaction`
 * / `findExistingDiscarded` early-returns make that impossible, but
 * the contract is "call once per newly-persisted email".
 *
 * Failure mode: the RPC may fail (db down, network blip). The ticket
 * and the existing convention in the other call sites (see
 * `process-document/index.ts:69-75`, `resilient-chat-route.ts:188-194`)
 * require fail-open: log the error, let the caller continue. A usage
 * counter bug must not block the user's seed pipeline.
 *
 * Role bypass: only `admin` bypasses the counter. `tester` is counted
 * normally — this matches the three other call sites. Note this
 * diverges from the ROLE_BYPASS pattern in
 * `supabase/functions/_shared/capabilities.ts:53` which covers BOTH
 * the capability gate and the usage counter for staff (admin) + dev
 * (tester). The capability gate bypass is broad (you can call the
 * feature at all); the usage counter bypass is narrow (your calls do
 * not increment the counter). The other call sites only bypass the
 * counter for `admin`; we mirror that here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Local copy of the role union. Mirrors `UserRole` in
 * `packages/mastra-server/src/lib/roles.ts`; inlined here so the
 * helper has no runtime dependencies beyond `@supabase/supabase-js`.
 * This lets the Deno integration test in
 * `supabase/functions/_shared/seed-emails-usage.integration.test.ts`
 * import this file directly without dragging the rest of the
 * mastra-server (which targets Bun, not Deno).
 *
 * If `UserRole` ever grows a fourth value, this file and the two
 * siblings (`supabase/functions/_shared/auth.ts`,
 * `packages/mastra-server/src/lib/roles.ts`) must move together —
 * the lint rule in `packages/frontend/src/lib/capabilities.ts` does
 * not cover this file.
 */
type CounterRole = "user" | "tester" | "admin";

const GMAIL_SYNC_CAPABILITY = "gmail_sync";

export interface IncrementResult {
  /**
   * True when the counter was actually incremented for this call.
   * False when the caller is `admin` (bypass) or when the RPC
   * failed and we failed-open.
   */
  counted: boolean;
  /**
   * True when the RPC returned `allowed=false`. The RPC has already
   * rolled back the increment, so the persisted counter stays
   * accurate. The caller can use this flag for observability (e.g.
   * "you've hit your Gmail quota" notification) but the seed-emails
   * processor currently ignores it — the email has already been
   * persisted at that point, and rolling it back would be more
   * surprising than letting it through.
   */
  quotaExhausted: boolean;
}

export interface IncrementContext {
  /**
   * Gmail message id. Used only in log lines so operators can
   * correlate a quota exhaustion with the message that hit the cap.
   */
  messageId: string;
}

/**
 * Increment the `gmail_sync` usage counter for the given user. Safe
 * to call from the seed-emails background loop; never throws on RPC
 * errors.
 */
export async function incrementGmailSyncUsage(
  supabase: SupabaseClient,
  userId: string,
  role: CounterRole,
  context: IncrementContext
): Promise<IncrementResult> {
  if (role === "admin") {
    // Admin bypass. Tester is NOT bypassed — see file header.
    return { counted: false, quotaExhausted: false };
  }

  const { data, error } = await supabase
    .schema("payments")
    .rpc("check_and_increment_usage", {
      target_user_id: userId,
      cap: GMAIL_SYNC_CAPABILITY,
    });

  if (error) {
    // Fail-open: a counter bug must not break the user's seed
    // pipeline. Log so observability can surface the regression.
    console.error(
      `[seed-emails] gmail_sync usage check failed; failing open (message ${context.messageId})`,
      error
    );
    return { counted: false, quotaExhausted: false };
  }

  const allowed = data?.[0]?.allowed ?? true;
  if (!allowed) {
    // The RPC has already rolled back the +1 internally
    // (see 20260705163606_add_usage_limits_and_counters.sql:290).
    console.warn(
      `[seed-emails] gmail_sync quota exhausted for user ${userId}; skipping message ${context.messageId}`
    );
    return { counted: false, quotaExhausted: true };
  }

  return { counted: true, quotaExhausted: false };
}
