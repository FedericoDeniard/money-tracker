import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types/database.types";

type TransactionAttachmentRow = Tables<"transaction_attachments">;

export interface TransactionAttachment extends TransactionAttachmentRow {
  signedUrl: string;
}

const BUCKET = "transaction-attachments";
const SIGNED_URL_TTL_SECONDS = 3600;

class TransactionAttachmentsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getTransactionAttachments(
    transactionId: string
  ): Promise<TransactionAttachment[]> {
    const { data: rows, error } = await this.supabase
      .from("transaction_attachments")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load attachments: ${error.message}`);
    }
    if (!rows || rows.length === 0) return [];

    const attachments = await Promise.all(
      rows.map(async row => {
        const { data: signed, error: signedError } = await this.supabase.storage
          .from(BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

        if (signedError || !signed?.signedUrl) {
          console.error(
            `[transaction-attachments] failed to sign URL for ${row.filename}`,
            signedError
          );
          return null;
        }

        return { ...row, signedUrl: signed.signedUrl };
      })
    );

    return attachments.filter((a): a is TransactionAttachment => a !== null);
  }

  async downloadAttachment(storagePath: string): Promise<Blob | null> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (error) {
      console.error("[transaction-attachments] download failed", error);
      return null;
    }

    return data;
  }
}

export function createTransactionAttachmentsService(
  supabase: SupabaseClient<Database>
) {
  return new TransactionAttachmentsService(supabase);
}
