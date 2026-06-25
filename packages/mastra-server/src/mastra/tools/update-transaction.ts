import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";
import { CATEGORY_VALUES, TRANSACTION_TYPE_VALUES } from "./constants";

const updateFields = z.object({
  category: z
    .enum(CATEGORY_VALUES)
    .optional()
    .describe("New spending category."),
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe(
      "New short headline for the transaction, e.g. 'June 2026 salary'."
    ),
  merchant: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("New merchant name, e.g. 'Starbucks'."),
  amount: z
    .number()
    .positive()
    .optional()
    .describe("New transaction amount as a positive number."),
  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .optional()
    .describe("New ISO 4217 currency code, e.g. 'USD'."),
  transaction_description: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe("New longer description of the transaction."),
  transaction_type: z
    .enum(TRANSACTION_TYPE_VALUES)
    .optional()
    .describe("New transaction type: 'income' or 'expense'."),
  transaction_date: z
    .string()
    .date()
    .optional()
    .describe(
      "New transaction date in YYYY-MM-DD format. Only the date part is stored."
    ),
});

export const updateTransactionTool = createTool({
  id: "update-transaction",
  description:
    "Update a single existing transaction's fields (name, category, merchant, amount, currency, description, type, or date). Use this only when the user explicitly asks to change, correct, recategorize, edit, or fix a transaction. The user must identify the transaction (by merchant, date, amount, or by listing it first with listTransactionsTool). Requires explicit user approval before any database write. Never use this to delete a transaction; use deleteTransactionTool instead.",
  requireApproval: true,
  inputSchema: z.object({
    transactionId: z
      .string()
      .uuid()
      .describe("UUID of the transaction to update."),
    updates: updateFields.describe(
      "Fields to update. At least one field must be provided. Omitted fields are left unchanged."
    ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transaction: z
      .object({
        id: z.string().uuid(),
        transactionDate: z.string(),
        name: z.string(),
        merchant: z.string(),
        amount: z.number(),
        currency: z.string().length(3),
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        category: z.enum(CATEGORY_VALUES),
        transactionDescription: z.string(),
      })
      .nullable(),
    message: z.string(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);

    const updates = input.updates;
    if (
      updates.category === undefined &&
      updates.name === undefined &&
      updates.merchant === undefined &&
      updates.amount === undefined &&
      updates.currency === undefined &&
      updates.transaction_description === undefined &&
      updates.transaction_type === undefined &&
      updates.transaction_date === undefined
    ) {
      throw new Error(
        "No fields provided to update. At least one field must be supplied."
      );
    }

    // Build the update payload. When the date changes, also update the
    // `date` timestamp column to keep it in sync (mirrors
    // create-transaction.ts which sets date = `${transaction_date}T00:00:00Z`).
    const payload: Record<string, unknown> = {};
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.merchant !== undefined) payload.merchant = updates.merchant;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.transaction_description !== undefined)
      payload.transaction_description = updates.transaction_description;
    if (updates.transaction_type !== undefined)
      payload.transaction_type = updates.transaction_type;
    if (updates.transaction_date !== undefined) {
      payload.transaction_date = updates.transaction_date;
      payload.date = `${updates.transaction_date}T00:00:00Z`;
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", input.transactionId)
      .select(
        "id, transaction_date, name, merchant, amount, currency, transaction_type, category, transaction_description"
      )
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    if (!data) {
      return {
        success: false,
        transaction: null,
        message:
          "Transaction not found or you do not have permission to update it.",
      };
    }

    return {
      success: true,
      transaction: {
        id: data.id as string,
        transactionDate: data.transaction_date as string,
        name: data.name as string,
        merchant: data.merchant as string,
        amount: Number(data.amount),
        currency: data.currency as string,
        transactionType:
          data.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
        category: data.category as (typeof CATEGORY_VALUES)[number],
        transactionDescription: data.transaction_description as string,
      },
      message: "Transaction updated successfully.",
    };
  },
  toModelOutput: output => {
    if (!output.success || !output.transaction) {
      return {
        type: "content",
        value: [
          {
            type: "text",
            text:
              output.message ||
              "The transaction could not be updated. Ask the user how to proceed.",
          },
        ],
      };
    }
    const t = output.transaction;
    const signedAmount =
      t.transactionType === "expense"
        ? `-${t.currency} ${t.amount.toLocaleString()}`
        : `+${t.currency} ${t.amount.toLocaleString()}`;
    return {
      type: "content",
      value: [
        {
          type: "text",
          text:
            `Transaction updated:\n` +
            `- ${t.name} (${t.merchant}): ${signedAmount} (${t.category}, ${t.transactionDate})\n` +
            `- Description: ${t.transactionDescription}\n\n` +
            `Reply to the user in plain prose confirming these details. Do NOT call any more tools.`,
        },
      ],
    };
  },
});
