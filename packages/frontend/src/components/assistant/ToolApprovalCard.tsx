import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, CircleAlert, Loader2, XIcon } from "lucide-react";
import type { ToolUIPart } from "ai";
import { Button } from "@/components/ui/Button";

type ToolPart = ToolUIPart;

const TOOL_DENIED_RESULT = "Tool call was not approved by the user";

function isExecutionDeniedOutput(output: unknown): boolean {
  if (typeof output === "string") {
    return output === TOOL_DENIED_RESULT;
  }
  if (output && typeof output === "object" && "type" in output) {
    return (output as { type: unknown }).type === "execution-denied";
  }
  return false;
}

interface ToolApprovalCardProps {
  part: ToolPart;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  /** i18n prefix, e.g. "assistant.deleteTransaction". The card looks up:
   *  .title_one/.title_other, .subtitle_one/.subtitle_other,
   *  .processing_one/.processing_other, .canceling_one/.canceling_other,
   *  .approved_one/.approved_other, .rejected_one/.rejected_other, .error
   */
  i18nPrefix: string;
  /** Content shown inside the approval-requested card (above buttons) */
  children?: ReactNode;
  /** Count for pluralization (default 1) */
  count?: number;
  /** Optional summary for success/denied cards (e.g. "Starbucks, Netflix") */
  summary?: string;
  /** Confirm button variant (default "primary"). Use "danger" for destructive actions. */
  confirmVariant?: "primary" | "danger";
  /** Confirm button icon (default CheckIcon). Use Trash2 for delete. */
  confirmIcon?: ReactNode;
}

export function ToolApprovalCard({
  part,
  onApprove,
  onReject,
  i18nPrefix,
  children,
  count = 1,
  summary,
  confirmVariant = "primary",
  confirmIcon,
}: ToolApprovalCardProps) {
  const { t } = useTranslation();

  if (part.state === "input-streaming" || part.state === "input-available") {
    return null;
  }

  const isDenied =
    part.state === "output-denied" ||
    (part.state === "output-available" && isExecutionDeniedOutput(part.output));

  if (part.state === "approval-requested") {
    return (
      <article
        className="my-3 max-w-md rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm"
        aria-label={t(`${i18nPrefix}.title`, { count })}
      >
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
          {t(`${i18nPrefix}.title`, { count })}
        </h3>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">
          {t(`${i18nPrefix}.subtitle`, { count })}
        </p>

        {children}

        <footer className="mt-5 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<XIcon size={16} />}
            onClick={() => onReject(part.approval.id)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            icon={confirmIcon ?? <CheckIcon size={16} />}
            onClick={() => onApprove(part.approval.id)}
          >
            {t("common.confirm")}
          </Button>
        </footer>
      </article>
    );
  }

  if (part.state === "approval-responded") {
    const wasApproved = part.approval.approved !== false;
    const processingKey = wasApproved
      ? `${i18nPrefix}.processing`
      : `${i18nPrefix}.canceling`;
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t(processingKey, { count })}
      >
        <Loader2
          className={`size-4 shrink-0 animate-spin ${
            wasApproved ? "text-[var(--text-secondary)]" : "text-rose-600"
          }`}
        />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t(processingKey, { count })}
        </span>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t(`${i18nPrefix}.rejected`, { count })}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <XIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t(`${i18nPrefix}.rejected`, { count })}
          </p>
          {summary && (
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t(`${i18nPrefix}.error`)}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
          <CircleAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t(`${i18nPrefix}.error`)}
          </p>
          {part.errorText && (
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {part.errorText}
            </p>
          )}
        </div>
      </div>
    );
  }

  // output-available (success)
  return (
    <div
      className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
      aria-label={t(`${i18nPrefix}.approved`, { count })}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t(`${i18nPrefix}.approved`, { count })}
        </p>
        {summary && (
          <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
