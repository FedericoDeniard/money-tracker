import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";

const FREQUENCY_VALUES = ["monthly", "yearly"] as const;
const STATUS_VALUES = ["active", "inactive", "unknown"] as const;
const SUBSCRIPTION_INACTIVE_GRACE_DAYS = 10;

/**
 * Mirrors the active/inactive/unknown logic in
 * packages/frontend/src/components/subscriptions/subscriptionStatus.ts.
 * If the threshold changes here, change it there too (and vice versa).
 * Duplicated because the server and frontend are separate packages and
 * a shared constants module is not worth the build-time wiring for a
 * single magic number.
 */
function computeStatus(
  nextEstimatedDate: string | null,
  now: Date = new Date()
): "active" | "inactive" | "unknown" {
  if (!nextEstimatedDate) return "unknown";
  const nextDate = new Date(`${nextEstimatedDate}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return "unknown";
  const deadline = new Date(nextDate);
  deadline.setDate(deadline.getDate() + SUBSCRIPTION_INACTIVE_GRACE_DAYS);
  return now > deadline ? "inactive" : "active";
}

export const listSubscriptionsTool = createTool({
  id: "list-subscriptions",
  description:
    "List the user's recurring subscriptions detected from their transactions. Returns an array of { merchantDisplay, currency, avgAmount, minAmount, maxAmount, occurrences, intervalDaysAvg, intervalStddev, frequency, lastDate, nextEstimatedDate, category, sourceEmailConsistent, confianceScore, status }.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    subscriptions: z.array(
      z.object({
        merchantDisplay: z.string(),
        merchantNormalized: z.string(),
        currency: z.string().length(3),
        avgAmount: z.number(),
        minAmount: z.number(),
        maxAmount: z.number(),
        occurrences: z.number().int(),
        intervalDaysAvg: z.number(),
        intervalStddev: z.number(),
        frequency: z.enum(FREQUENCY_VALUES),
        lastDate: z.string(),
        nextEstimatedDate: z.string().nullable(),
        category: z.string().nullable(),
        sourceEmailConsistent: z.boolean(),
        // The RPC rounds to 2 decimals (round(..., 2)), so accept
        // any number in [0, 100]. int() rejects values like 87.42
        // and the AI SDK then sees a validation-error tool result
        // instead of the actual data, which leads to hallucinated
        // answers.
        confianceScore: z.number().min(0).max(100),
        // Precomputed active/inactive based on nextEstimatedDate
        // + SUBSCRIPTION_INACTIVE_GRACE_DAYS (see computeStatus).
        // The agent does not have a clock or the grace constant, so
        // we compute it here so it can report which subscriptions
        // are still charging the user.
        status: z.enum(STATUS_VALUES),
      })
    ),
    count: z.number().int().nonnegative(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (_input, ctx) => {
    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    // Thresholds match the /subscriptions page (Subscriptions.tsx
    // passes minConfidence: 80). Hardcoded so the agent cannot
    // negotiate the recall/precision tradeoff per turn.
    const { data, error } = await supabase.rpc("get_subscription_candidates", {
      p_min_confidence: 80,
      p_min_occurrences: 2,
    });

    if (error) {
      throw new Error(`Failed to list subscriptions: ${error.message}`);
    }

    const rawRows = (data ?? []) as Array<Record<string, unknown>>;

    const now = new Date();
    const subscriptions = rawRows.map(r => {
      const nextEstimatedDate = r.next_estimated_date
        ? String(r.next_estimated_date)
        : null;
      return {
        merchantDisplay: String(r.merchant_display ?? ""),
        merchantNormalized: String(r.merchant_normalized ?? ""),
        currency: String(r.currency ?? "USD"),
        avgAmount: Number(r.avg_amount ?? 0),
        minAmount: Number(r.min_amount ?? 0),
        maxAmount: Number(r.max_amount ?? 0),
        occurrences: Number(r.occurrences ?? 0),
        intervalDaysAvg: Number(r.interval_days_avg ?? 0),
        intervalStddev: Number(r.interval_stddev ?? 0),
        frequency: (r.frequency as "monthly" | "yearly") ?? "monthly",
        lastDate: String(r.last_date ?? ""),
        nextEstimatedDate,
        category: r.category ? String(r.category) : null,
        sourceEmailConsistent: Boolean(r.source_email_consistent),
        confianceScore: Math.min(
          100,
          Math.max(0, Number(r.confidence_score ?? 0))
        ),
        status: computeStatus(nextEstimatedDate, now),
      };
    });

    return { subscriptions, count: subscriptions.length };
  },
});
