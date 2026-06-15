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

export const createTransactionTool = createTool({
  id: "create-transaction",
  description:
    "Create a new transaction on behalf of the user. Use this only when the user explicitly asks to add, log, register, or record a transaction (income or expense). Do NOT use this for transactions already detected from Gmail emails (those are inserted by the email processing pipeline). The tool requires explicit user approval before any database write: the agent must summarize the proposed transaction (merchant, amount, category, date, description) and then call this tool so the user can confirm or cancel.",
  requireApproval: true,
  inputSchema: z.object({
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
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transaction: z
      .object({
        id: z.string().uuid(),
        transactionDate: z.string(),
        merchant: z.string(),
        amount: z.number(),
        currency: z.string().length(3),
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        category: z.enum(CATEGORY_VALUES),
      })
      .nullable(),
    message: z.string(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    const { supabaseToken, userId } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        amount: input.amount,
        currency: input.currency,
        transaction_type: input.transaction_type,
        transaction_description: input.transaction_description,
        transaction_date: input.transaction_date,
        merchant: input.merchant,
        category: input.category,
        date: `${input.transaction_date}T00:00:00Z`,
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

    return {
      success: true,
      transaction: {
        id: data.id as string,
        transactionDate: data.transaction_date as string,
        merchant: data.merchant as string,
        amount: Number(data.amount),
        currency: data.currency as string,
        transactionType:
          data.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
        category: data.category as (typeof CATEGORY_VALUES)[number],
      },
      message: "Transaction created successfully.",
    };
  },
});
