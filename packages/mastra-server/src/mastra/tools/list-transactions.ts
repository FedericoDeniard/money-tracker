import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";

const CATEGORY_VALUES = [
  "salary",
  "entertainment",
  "investment",
  "food",
  "transport",
  "services",
  "health",
  "education",
  "housing",
  "clothing",
  "other",
] as const;

const TRANSACTION_TYPE_VALUES = ["income", "expense"] as const;

export const listTransactionsTool = createTool({
  id: "list-transactions",
  description:
    "List the user's transactions with optional filters. Use this whenever the user asks about their spending, recent purchases, transaction history, specific merchants, categories, time ranges, or amount thresholds. All filters are optional; omit them to return the most recent N transactions.",
  inputSchema: z.object({
    from: z
      .string()
      .date()
      .optional()
      .describe(
        "Start date in YYYY-MM-DD, inclusive. Filters by transaction_date."
      ),
    to: z
      .string()
      .date()
      .optional()
      .describe(
        "End date in YYYY-MM-DD, inclusive. Filters by transaction_date."
      ),
    amount_min: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Minimum transaction amount (inclusive). E.g. 50 means amount >= 50."
      ),
    amount_max: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Maximum transaction amount (inclusive). E.g. 100 means amount <= 100."
      ),
    currency: z
      .string()
      .length(3)
      .toUpperCase()
      .optional()
      .describe("ISO 4217 currency code. E.g. 'USD', 'ARS', 'EUR'."),
    transaction_type: z
      .enum(TRANSACTION_TYPE_VALUES)
      .optional()
      .describe("Type of transaction: income or expense."),
    merchant: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        "Merchant name or partial substring match. Case-insensitive (ilike)."
      ),
    category: z.enum(CATEGORY_VALUES).optional().describe("Spending category."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe(
        "Maximum number of transactions to return. Default 20, max 100."
      ),
  }),
  outputSchema: z.object({
    transactions: z.array(
      z.object({
        id: z.string().uuid(),
        transactionDate: z.string(),
        merchant: z.string(),
        amount: z.number(),
        currency: z.string().length(3),
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        category: z.enum(CATEGORY_VALUES).nullable(),
      })
    ),
    count: z.number().int().nonnegative(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    if (input.from && input.to && input.from > input.to) {
      return { transactions: [], count: 0 };
    }
    if (
      input.amount_min !== undefined &&
      input.amount_max !== undefined &&
      input.amount_min > input.amount_max
    ) {
      return { transactions: [], count: 0 };
    }

    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    let q = supabase
      .from("transactions")
      .select(
        "id, transaction_date, merchant, amount, currency, transaction_type, category"
      )
      .eq("discarded", false)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(input.limit);

    if (input.from) q = q.gte("transaction_date", input.from);
    if (input.to) q = q.lte("transaction_date", input.to);
    if (input.amount_min !== undefined) q = q.gte("amount", input.amount_min);
    if (input.amount_max !== undefined) q = q.lte("amount", input.amount_max);
    if (input.currency) q = q.eq("currency", input.currency);
    if (input.transaction_type)
      q = q.eq("transaction_type", input.transaction_type);
    if (input.category) q = q.eq("category", input.category);
    if (input.merchant) q = q.ilike("merchant", `%${input.merchant}%`);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to list transactions: ${error.message}`);
    }

    const transactions = (data ?? []).map(r => ({
      id: r.id as string,
      transactionDate: r.transaction_date as string,
      merchant: r.merchant as string,
      amount: Number(r.amount),
      currency: r.currency as string,
      transactionType:
        r.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
      category: (r.category as (typeof CATEGORY_VALUES)[number] | null) ?? null,
    }));

    return { transactions, count: transactions.length };
  },
});
