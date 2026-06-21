import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";
import { CATEGORY_VALUES, TRANSACTION_TYPE_VALUES } from "./constants";

export const createTransactionTool = createTool({
  id: "create-transaction",
  description:
    "Create one or more new transactions on behalf of the user. Pass an array of 1-50 transactions in a single call. Use this only when the user explicitly asks to add, log, register, or record transactions (income or expense). Do NOT use this for transactions already detected from Gmail emails (those are inserted by the email processing pipeline). The tool requires explicit user approval before any database write: the agent must summarize the proposed transactions and then call this tool so the user can confirm or cancel.",
  requireApproval: true,
  inputSchema: z.object({
    transactions: z
      .array(
        z.object({
          transaction_type: z
            .enum(TRANSACTION_TYPE_VALUES)
            .describe("Type of transaction: 'income' or 'expense'."),
          merchant: z
            .string()
            .min(1)
            .max(255)
            .describe("Merchant name, e.g. 'Starbucks', 'Acme Corp'."),
          amount: z
            .number()
            .positive()
            .describe("Transaction amount as a positive number, e.g. 50.00."),
          currency: z
            .string()
            .length(3)
            .toUpperCase()
            .default("USD")
            .describe("ISO 4217 currency code. Defaults to 'USD'."),
          category: z.enum(CATEGORY_VALUES).describe("Spending category."),
          transaction_date: z
            .string()
            .date()
            .describe("Transaction date in YYYY-MM-DD format."),
          transaction_description: z
            .string()
            .min(1)
            .max(500)
            .describe("Short description of the transaction."),
        })
      )
      .min(1)
      .max(50)
      .describe(
        "Array of 1-50 transactions to create. Batch all transactions into a single call instead of invoking the tool multiple times."
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transactions: z.array(
      z.object({
        id: z.string().uuid(),
        transactionDate: z.string(),
        merchant: z.string(),
        amount: z.number(),
        currency: z.string().length(3),
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        category: z.enum(CATEGORY_VALUES),
      })
    ),
    totalCount: z.number().int().nonnegative(),
    message: z.string(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    const { supabaseToken, userId } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);
    const results = [];

    for (const txn of input.transactions) {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount: txn.amount,
          currency: txn.currency,
          transaction_type: txn.transaction_type,
          transaction_description: txn.transaction_description,
          transaction_date: txn.transaction_date,
          merchant: txn.merchant,
          category: txn.category,
          date: `${txn.transaction_date}T00:00:00Z`,
          source_email: "manual",
          source_message_id: `manual-${crypto.randomUUID()}`,
        })
        .select(
          "id, transaction_date, merchant, amount, currency, transaction_type, category"
        )
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      results.push({
        id: data.id as string,
        transactionDate: data.transaction_date as string,
        merchant: data.merchant as string,
        amount: Number(data.amount),
        currency: data.currency as string,
        transactionType:
          data.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
        category: data.category as (typeof CATEGORY_VALUES)[number],
      });
    }

    return {
      success: true,
      transactions: results,
      totalCount: results.length,
      message: `${results.length} transaction(s) created successfully.`,
    };
  },
  toModelOutput: output => {
    if (!output.success || output.transactions.length === 0) {
      return {
        type: "content",
        value: [
          {
            type: "text",
            text:
              output.message ||
              "The transactions could not be created. Ask the user how to proceed.",
          },
        ],
      };
    }
    const lines = output.transactions.map(
      (t: {
        transactionType: string;
        currency: string;
        amount: number;
        merchant: string;
        category: string;
        transactionDate: string;
      }) => {
        const signedAmount =
          t.transactionType === "expense"
            ? `-${t.currency} ${t.amount.toLocaleString()}`
            : `+${t.currency} ${t.amount.toLocaleString()}`;
        return `- ${t.merchant}: ${signedAmount} (${t.category}, ${t.transactionDate})`;
      }
    );
    return {
      type: "content",
      value: [
        {
          type: "text",
          text:
            `${output.totalCount} transaction(s) saved:\n` +
            `${lines.join("\n")}\n\n` +
            `Reply to the user in plain prose confirming these details. Do NOT call any more tools.`,
        },
      ],
    };
  },
});
