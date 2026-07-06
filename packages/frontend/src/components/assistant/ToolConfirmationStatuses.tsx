import { Loader2, XIcon, CheckIcon, CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";

interface StatusRowProps {
  icon: ReactNode;
  tone: "neutral" | "positive" | "negative" | "error";
  title: string;
  description?: string;
  ariaLabel: string;
}

function StatusRow({
  icon,
  tone,
  title,
  description,
  ariaLabel,
}: StatusRowProps) {
  const colorClass =
    tone === "positive"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "negative"
        ? "bg-rose-100 text-rose-700"
        : tone === "error"
          ? "bg-red-100 text-red-700"
          : "bg-zinc-100 text-zinc-700";
  return (
    <div
      className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
      aria-label={ariaLabel}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        {description && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProcessingStatus({
  approved,
  count,
  t,
}: {
  approved: boolean;
  count: number;
  t: TFunction;
}) {
  const key = approved
    ? "assistant.createTransaction.processing"
    : "assistant.createTransaction.canceling";
  return (
    <div
      className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
      aria-label={t(key, { count })}
    >
      <Loader2
        className={`size-4 shrink-0 animate-spin ${approved ? "text-[var(--text-secondary)]" : "text-rose-600"}`}
      />
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {t(key, { count })}
      </span>
    </div>
  );
}

export function DeniedStatus({
  count,
  summary,
  t,
}: {
  count: number;
  summary: string;
  t: TFunction;
}) {
  return (
    <StatusRow
      tone="negative"
      icon={<XIcon className="size-4" />}
      title={t("assistant.createTransaction.rejected", { count })}
      description={summary || undefined}
      ariaLabel={t("assistant.createTransaction.rejected", { count })}
    />
  );
}

export function ErrorStatus({
  errorText,
  t,
}: {
  errorText?: string;
  t: TFunction;
}) {
  return (
    <StatusRow
      tone="error"
      icon={<CircleAlert className="size-4" />}
      title={t("assistant.createTransaction.error")}
      description={errorText}
      ariaLabel={t("assistant.createTransaction.error")}
    />
  );
}

export function ApprovedStatus({
  count,
  summary,
}: {
  count: number;
  summary: string;
}) {
  const { t } = useTranslation();
  return (
    <StatusRow
      tone="positive"
      icon={<CheckIcon className="size-4" />}
      title={t("assistant.createTransaction.approved", { count })}
      description={summary || undefined}
      ariaLabel={t("assistant.createTransaction.approved", { count })}
    />
  );
}
