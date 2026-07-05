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
  tag_ids: z
    .array(z.string().uuid())
    .optional()
    .describe(
      "Optional list of tag UUIDs that REPLACE the current tag set on the transaction. Omit the field to leave tags unchanged. Pass an empty array to remove all tags. Resolve tag UUIDs first by calling listTagsTool."
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
        tagIds: z.array(z.string().uuid()),
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

    const updates = input.updates;
    const hasFieldChange =
      updates.category !== undefined ||
      updates.name !== undefined ||
      updates.merchant !== undefined ||
      updates.amount !== undefined ||
      updates.currency !== undefined ||
      updates.transaction_description !== undefined ||
      updates.transaction_type !== undefined ||
      updates.transaction_date !== undefined;
    const hasTagsChange = updates.tag_ids !== undefined;

    if (!hasFieldChange && !hasTagsChange) {
      throw new Error(
        "No fields provided to update. At least one field or tag_ids must be supplied."
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

    let data: Record<string, unknown> | null = null;
    let updateError: { message: string } | null = null;

    if (hasFieldChange) {
      const result = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", input.transactionId)
        .select(
          "id, transaction_date, name, merchant, amount, currency, transaction_type, category, transaction_description"
        )
        .single();

      data = (result.data as Record<string, unknown> | null) ?? null;
      updateError = result.error;
    } else {
      // Tags-only update: still need to confirm ownership before mutating
      // junction rows.
      const { data: owned, error: ownError } = await supabase
        .from("transactions")
        .select("id")
        .eq("id", input.transactionId)
        .single();

      if (ownError) {
        throw new Error(
          `Failed to load transaction for tag update: ${ownError.message}`
        );
      }
      if (!owned) {
        return {
          success: false,
          transaction: null,
          message:
            "Transaction not found or you do not have permission to update it.",
        };
      }

      const { data: full, error: fullError } = await supabase
        .from("transactions")
        .select(
          "id, transaction_date, name, merchant, amount, currency, transaction_type, category, transaction_description"
        )
        .eq("id", input.transactionId)
        .single();

      if (fullError) {
        throw new Error(`Failed to load transaction: ${fullError.message}`);
      }
      data = full as Record<string, unknown> | null;
    }

    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    if (!data) {
      return {
        success: false,
        transaction: null,
        message:
          "Transaction not found or you do not have permission to update it.",
      };
    }

    let finalTagIds: string[] = [];
    if (hasTagsChange) {
      const requestedTagIds = Array.from(new Set(updates.tag_ids ?? []));

      if (requestedTagIds.length > 0) {
        const { data: ownedTags, error: ownedTagsError } = await supabase
          .from("tags")
          .select("id")
          .eq("user_id", userId)
          .in("id", requestedTagIds);

        if (ownedTagsError) {
          throw new Error(`Failed to validate tags: ${ownedTagsError.message}`);
        }

        const valid = new Set((ownedTags ?? []).map(t => t.id as string));
        const missing = requestedTagIds.filter(id => !valid.has(id));
        if (missing.length > 0) {
          throw new Error(
            `One or more tag_ids do not belong to the user: ${missing.join(", ")}`
          );
        }
      }

      const { error: deleteError } = await supabase
        .from("transaction_tags")
        .delete()
        .eq("transaction_id", input.transactionId);

      if (deleteError) {
        throw new Error(
          `Failed to clear transaction tags: ${deleteError.message}`
        );
      }

      if (requestedTagIds.length > 0) {
        const rows = requestedTagIds.map(tagId => ({
          transaction_id: input.transactionId,
          tag_id: tagId,
          user_id: userId,
        }));
        const { error: insertError } = await supabase
          .from("transaction_tags")
          .insert(rows);

        if (insertError) {
          throw new Error(
            `Failed to assign transaction tags: ${insertError.message}`
          );
        }
      }

      finalTagIds = requestedTagIds;
    } else {
      const { data: existing, error: existingError } = await supabase
        .from("transaction_tags")
        .select("tag_id")
        .eq("transaction_id", input.transactionId);

      if (existingError) {
        throw new Error(
          `Failed to load existing tags: ${existingError.message}`
        );
      }

      finalTagIds = (existing ?? []).map(r => r.tag_id as string);
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
        tagIds: finalTagIds,
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
