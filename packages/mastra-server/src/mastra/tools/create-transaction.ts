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
          name: z
            .string()
            .min(1)
            .max(255)
            .describe(
              "Short headline for the transaction, e.g. 'June 2026 salary' or 'Coffee at Starbucks'. Used as the card title."
            ),
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
            .describe("Longer description of what the transaction is for."),
          tag_ids: z
            .array(z.string().uuid())
            .optional()
            .describe(
              "Optional UUIDs of existing custom tags to assign to the new transaction. Resolve tag UUIDs first by calling listTagsTool. Tags are not created or deleted here — only assigned."
            ),
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
        name: z.string(),
        merchant: z.string(),
        amount: z.number(),
        currency: z.string().length(3),
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        category: z.enum(CATEGORY_VALUES),
        tagIds: z.array(z.string().uuid()),
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

    // Collect every distinct tag_id across all transactions in this batch
    // and verify they all belong to the user. We do this once up front so
    // a single invalid tag aborts the whole batch instead of leaving a
    // half-created state.
    const requestedTagIds = Array.from(
      new Set(input.transactions.flatMap(t => t.tag_ids ?? []))
    );

    const validTagIds = new Set<string>();
    if (requestedTagIds.length > 0) {
      const { data: ownedTags, error: tagsError } = await supabase
        .from("tags")
        .select("id")
        .eq("user_id", userId)
        .in("id", requestedTagIds);

      if (tagsError) {
        throw new Error(`Failed to validate tags: ${tagsError.message}`);
      }

      for (const t of ownedTags ?? []) validTagIds.add(t.id as string);

      const missing = requestedTagIds.filter(id => !validTagIds.has(id));
      if (missing.length > 0) {
        throw new Error(
          `One or more tag_ids do not belong to the user: ${missing.join(", ")}`
        );
      }
    }

    for (const txn of input.transactions) {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount: txn.amount,
          currency: txn.currency,
          transaction_type: txn.transaction_type,
          name: txn.name,
          transaction_description: txn.transaction_description,
          transaction_date: txn.transaction_date,
          merchant: txn.merchant,
          category: txn.category,
          date: `${txn.transaction_date}T00:00:00Z`,
          source_email: "manual",
          source_message_id: `manual-${crypto.randomUUID()}`,
        })
        .select(
          "id, transaction_date, name, merchant, amount, currency, transaction_type, category"
        )
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      const tagIds = Array.from(new Set(txn.tag_ids ?? []));
      if (tagIds.length > 0) {
        const rows = tagIds.map(tagId => ({
          transaction_id: data.id as string,
          tag_id: tagId,
          user_id: userId,
        }));
        const { error: tagsInsertError } = await supabase
          .from("transaction_tags")
          .insert(rows);

        if (tagsInsertError) {
          throw new Error(
            `Failed to assign tags to new transaction: ${tagsInsertError.message}`
          );
        }
      }

      results.push({
        id: data.id as string,
        transactionDate: data.transaction_date as string,
        name: data.name as string,
        merchant: data.merchant as string,
        amount: Number(data.amount),
        currency: data.currency as string,
        transactionType:
          data.transaction_type as (typeof TRANSACTION_TYPE_VALUES)[number],
        category: data.category as (typeof CATEGORY_VALUES)[number],
        tagIds: tagIds,
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
        name: string;
        merchant: string;
        category: string;
        transactionDate: string;
      }) => {
        const signedAmount =
          t.transactionType === "expense"
            ? `-${t.currency} ${t.amount.toLocaleString()}`
            : `+${t.currency} ${t.amount.toLocaleString()}`;
        return `- ${t.name} (${t.merchant}): ${signedAmount} (${t.category}, ${t.transactionDate})`;
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
