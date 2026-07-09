import { Download, ExternalLink, FileText, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTransactionAttachments } from "../../hooks/useTransactionAttachments";
import { getSupabase } from "../../lib/supabase";
import { createTransactionAttachmentsService } from "../../services/transaction-attachments.service";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface TransactionAttachmentsProps {
  transactionId: string;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

async function downloadAttachment(
  storagePath: string,
  filename: string
): Promise<void> {
  const supabase = await getSupabase();
  const service = createTransactionAttachmentsService(supabase);
  const blob = await service.downloadAttachment(storagePath);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TransactionAttachments({
  transactionId,
}: TransactionAttachmentsProps) {
  const { t } = useTranslation();
  const { data: attachments, isLoading } =
    useTransactionAttachments(transactionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(a => isImage(a.mime_type));
  const pdfs = attachments.filter(a => isPdf(a.mime_type));
  const others = attachments.filter(
    a => !isImage(a.mime_type) && !isPdf(a.mime_type)
  );

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip size={16} className="text-[var(--text-secondary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("transactions.attachments")}
        </h3>
        <span className="text-xs text-[var(--text-secondary)]">
          ({attachments.length})
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map(attachment => (
            <a
              key={attachment.id}
              href={attachment.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden border border-zinc-100 hover:opacity-80 transition-opacity"
            >
              <img
                src={attachment.signedUrl}
                alt={attachment.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {(pdfs.length > 0 || others.length > 0) && (
        <div className="space-y-2">
          {[...pdfs, ...others].map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
            >
              <div className="shrink-0 size-9 rounded-lg bg-zinc-100 flex items-center justify-center text-[var(--text-secondary)]">
                <FileText size={18} />
              </div>
              <span className="flex-1 truncate text-sm text-[var(--text-primary)]">
                {attachment.filename}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={attachment.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t("transactions.viewAttachment")} – ${attachment.filename}`}
                  className="inline-flex items-center justify-center size-8 rounded-md text-[var(--text-secondary)] hover:bg-zinc-200 hover:text-[var(--text-primary)] transition-colors"
                  title={t("transactions.viewAttachment")}
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  aria-label={`${t("transactions.downloadAttachment", "Download")} – ${attachment.filename}`}
                  onClick={() =>
                    downloadAttachment(
                      attachment.storage_path,
                      attachment.filename
                    )
                  }
                  className="inline-flex items-center justify-center size-8 rounded-md text-[var(--text-secondary)] hover:bg-zinc-200 hover:text-[var(--text-primary)] transition-colors"
                  title={t("transactions.downloadAttachment")}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
