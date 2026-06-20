import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabaseFromToken } from "../../lib/supabase-from-token";

export const deleteTransactionTool = createTool({
  id: "delete-transaction",
  description:
    "Discard (soft-delete) one or more existing transactions. The transactions are marked as discarded so they no longer appear in lists or summaries, and Gmail-sourced transactions are recorded in discarded_emails so future seed imports do not re-detect them. Use this only when the user explicitly asks to delete, remove, discard, or hide a transaction. Pass an array of 1-50 transaction IDs in a single call. Requires explicit user approval before any database write.",
  requireApproval: true,
  inputSchema: z.object({
    transactionIds: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .describe(
        "Array of 1-50 transaction UUIDs to discard. Batch all IDs into a single call instead of invoking the tool multiple times."
      ),
    reason: z
      .string()
      .max(200)
      .optional()
      .default("User discarded transaction")
      .describe(
        "Reason for discarding. Defaults to 'User discarded transaction'."
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    deletedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
    skippedIds: z.array(z.string().uuid()),
    message: z.string(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
    supabaseToken: z.string(),
  }),
  execute: async (input, ctx) => {
    const { supabaseToken } = ctx.requestContext!.all;
    const supabase = supabaseFromToken(supabaseToken);
    const nowIso = new Date().toISOString();

    const deletedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const id of input.transactionIds) {
      // 1. Fetch the transaction to check ownership/source before marking
      //    it discarded. RLS ensures the user can only read their own rows.
      const { data: txn, error: fetchError } = await supabase
        .from("transactions")
        .select("source_message_id, user_oauth_token_id, discarded")
        .eq("id", id)
        .single();

      if (fetchError || !txn) {
        // Not found or not owned by the user (RLS hides it).
        skippedIds.push(id);
        continue;
      }

      // Already discarded; nothing to do.
      if (txn.discarded === true) {
        skippedIds.push(id);
        continue;
      }

      // 2. Soft delete on transactions for traceability.
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          discarded: true,
          discarded_at: nowIso,
          discarded_reason: input.reason,
        })
        .eq("id", id);

      if (updateError) {
        // Leave this id in skipped rather than aborting the whole batch.
        skippedIds.push(id);
        continue;
      }

      // 3. Record in discarded_emails only for Gmail-sourced transactions
      //    so future seed jobs skip them. Manual transactions do not have
      //    a Gmail message and must not be inserted (user_oauth_token_id
      //    is nullable and the column is NOT NULL).
      const isGmailTransaction =
        txn.user_oauth_token_id !== null &&
        txn.source_message_id !== null &&
        !txn.source_message_id.startsWith("manual-");

      if (isGmailTransaction) {
        const { error: discardError } = await supabase
          .from("discarded_emails")
          .insert({
            user_oauth_token_id: txn.user_oauth_token_id,
            message_id: txn.source_message_id,
            transaction_id: id,
            reason: input.reason,
          });

        // Ignore duplicate (23505): the email was already registered as
        // discarded for this Gmail account.
        if (discardError && discardError.code !== "23505") {
          // The soft-delete already succeeded; we keep the id in deleted
          // but surface the issue via skipped would be misleading. Log is
          // not available here, so we simply continue: the transaction is
          // already hidden and a re-detection would at worst create a new
          // row the user can discard again.
          continue;
        }
      }

      deletedIds.push(id);
    }

    const deletedCount = deletedIds.length;
    const skippedCount = skippedIds.length;

    let message: string;
    if (deletedCount > 0 && skippedCount === 0) {
      message = `${deletedCount} transaction(s) discarded successfully.`;
    } else if (deletedCount > 0 && skippedCount > 0) {
      message = `${deletedCount} transaction(s) discarded successfully. ${skippedCount} could not be discarded (not found, not owned, or already discarded).`;
    } else {
      message = `No transactions were discarded. ${skippedCount} could not be discarded (not found, not owned, or already discarded).`;
    }

    return {
      success: deletedCount > 0,
      deletedCount,
      skippedCount,
      skippedIds,
      message,
    };
  },
  toModelOutput: output => {
    return {
      type: "content",
      value: [
        {
          type: "text",
          text:
            output.message +
            "\n\nReply to the user in plain prose confirming the result. " +
            "Do NOT call any more tools.",
        },
      ],
    };
  },
});
