// Persist transaction attachments (receipts/tickets) to Supabase Storage and
// the public.transaction_attachments metadata table.
//
// Used by gmail-webhook and process-document after a transaction is saved.
// Best-effort: errors are logged but never thrown, so a storage failure never
// rolls back an already-saved transaction.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { AnalyzedAttachment } from "./document-analysis.ts";

const BUCKET = "transaction-attachments";

interface SaveTransactionAttachmentsParams {
  supabase: SupabaseClient;
  transactionId: string;
  userId: string;
  attachments: AnalyzedAttachment[];
}

function extensionFor(mimeType: string, filename: string): string {
  if (filename.includes(".")) {
    const ext = filename.split(".").pop();
    if (ext) return ext;
  }
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

/**
 * Upload each attachment to the private `transaction-attachments` bucket and
 * insert a metadata row in public.transaction_attachments.
 *
 * Path convention: {user_id}/{transaction_id}/{uuid}.{ext}
 * (matches the storage RLS policies that scope access by the first folder).
 *
 * Returns the number of attachments successfully persisted. Failures are
 * logged and skipped so a single bad file does not abort the rest.
 */
export async function saveTransactionAttachments({
  supabase,
  transactionId,
  userId,
  attachments,
}: SaveTransactionAttachmentsParams): Promise<number> {
  if (attachments.length === 0) return 0;

  let saved = 0;

  for (const attachment of attachments) {
    const ext = extensionFor(attachment.mimeType, attachment.filename);
    const storagePath = `${userId}/${transactionId}/${crypto.randomUUID()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, attachment.data, {
          contentType: attachment.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[transaction-attachments] storage upload failed", {
          filename: attachment.filename,
          error: uploadError,
        });
        continue;
      }

      const { error: insertError } = await supabase
        .from("transaction_attachments")
        .insert({
          transaction_id: transactionId,
          user_id: userId,
          storage_path: storagePath,
          filename: attachment.filename,
          mime_type: attachment.mimeType,
          size_bytes: attachment.data.length,
        });

      if (insertError) {
        console.error(
          "[transaction-attachments] metadata insert failed; cleaning up storage",
          { filename: attachment.filename, error: insertError }
        );
        // Avoid orphaning the uploaded object if the row insert fails.
        await supabase.storage.from(BUCKET).remove([storagePath]);
        continue;
      }

      saved += 1;
      console.log(
        `[transaction-attachments] saved ${attachment.filename} (${attachment.data.length} bytes) for transaction ${transactionId}`
      );
    } catch (error) {
      console.error(
        "[transaction-attachments] unexpected error saving attachment",
        { filename: attachment.filename, error }
      );
    }
  }

  return saved;
}
