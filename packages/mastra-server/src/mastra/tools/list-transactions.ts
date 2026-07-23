import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";
import {
  CATEGORY_VALUES,
  REPORT_STATUS_VALUES,
  TRANSACTION_TYPE_VALUES,
} from "./constants";

export const listTransactionsTool = createTool({
  id: "list-transactions",
  description:
    "List the user's transactions with optional filters. Use this whenever the user asks about their spending, recent purchases, transaction history, specific merchants, categories, time ranges, amount thresholds, or transactions in a specific report. All filters are optional; omit them to return the most recent N transactions. Each result includes a nullable `report` descriptor ({id, title, status}) so the agent can reference transactions by report title without exposing UUIDs. To filter by report, pass `report_ids` (any-of, 1-50 UUIDs) or `without_report: true` (transactions that are not assigned to any report). These two report filters are mutually exclusive.",
  inputSchema: z
    .object({
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
      category: z
        .enum(CATEGORY_VALUES)
        .optional()
        .describe("Spending category."),
      report_ids: z
        .array(z.string().uuid())
        .min(1)
        .max(50)
        .optional()
        .describe(
          "Optional list of 1-50 report UUIDs. Returns only transactions whose `report_id` matches one of these reports. Resolve report UUIDs first by calling listReportsTool. Mutually exclusive with `without_report`."
        ),
      without_report: z
        .boolean()
        .optional()
        .describe(
          "When true, returns only transactions that are not assigned to any report (report_id is null). Mutually exclusive with `report_ids`."
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe(
          "Maximum number of transactions to return. Default 20, max 100."
        ),
    })
    .refine(d => !(d.report_ids && d.without_report), {
      message:
        "report_ids and without_report are mutually exclusive; pass only one.",
      path: ["report_ids"],
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
        transactionName: z.string(),
        transactionDescription: z.string().nullable(),
        tags: z.array(
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            color: z.enum([
              "slate",
              "emerald",
              "indigo",
              "coral",
              "amber",
              "cerulean",
              "lavender",
              "rose",
            ]),
          })
        ),
        report: z
          .object({
            id: z.string().uuid(),
            title: z.string(),
            status: z.enum(REPORT_STATUS_VALUES),
          })
          .nullable(),
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
        "id, transaction_date, merchant, amount, currency, transaction_type, category, name, transaction_description, transaction_tags ( tags ( id, name, color ) ), reports ( id, title, status )"
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
    if (input.report_ids && input.report_ids.length > 0) {
      q = q.in("report_id", input.report_ids);
    } else if (input.without_report) {
      q = q.is("report_id", null);
    }

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to list transactions: ${error.message}`);
    }

    const transactions = (data ?? []).map(r => {
      const junction = (r.transaction_tags ?? []) as unknown as Array<{
        tags: { id: string; name: string; color: string } | null;
      }>;
      const tags = junction
        .map(j => j.tags)
        .filter(
          (t): t is { id: string; name: string; color: string } => t !== null
        )
        .map(t => ({
          id: t.id,
          name: t.name,
          color: t.color as
            | "slate"
            | "emerald"
            | "indigo"
            | "coral"
            | "amber"
            | "cerulean"
            | "lavender"
            | "rose",
        }));

      const reportRaw = (r as { reports: unknown }).reports;
      let report: {
        id: string;
        title: string;
        status: (typeof REPORT_STATUS_VALUES)[number];
      } | null = null;
      if (
        reportRaw &&
        typeof reportRaw === "object" &&
        "id" in reportRaw &&
        "title" in reportRaw &&
        "status" in reportRaw
      ) {
        const status = (reportRaw as { status: string }).status;
        report = {
          id: (reportRaw as { id: string }).id,
          title: (reportRaw as { title: string }).title,
          status:
            status === "archived" ? ("archived" as const) : ("active" as const),
        };
      }

      return {
        id: r.id as string,
        transactionDate: r.transaction_date as string,
        merchant: r.merchant as string,
        amount: Number(r.amount),
        currency: r.currency as string,
        transactionType:
          r.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
        category:
          (r.category as (typeof CATEGORY_VALUES)[number] | null) ?? null,
        transactionName: r.name as string,
        transactionDescription: r.transaction_description as string | null,
        tags,
        report,
      };
    });

    return { transactions, count: transactions.length };
  },
});
