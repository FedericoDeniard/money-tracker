import { CalendarClock, Mail, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormatDate } from "../../hooks/useFormatDate";
import type { SubscriptionCandidate } from "../../services/transactions.service";
import { formatCurrency } from "../../utils/currency";
import { getSubscriptionStatus } from "./subscriptionStatus";

interface SubscriptionListItemProps {
  candidate: SubscriptionCandidate;
}

function getStatusClass(status: "active" | "inactive" | "unknown"): string {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "inactive") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

export function SubscriptionListItem({ candidate }: SubscriptionListItemProps) {
  const { t } = useTranslation();
  const { formatShortDate } = useFormatDate();
  const confidence = Math.min(100, Math.max(0, Math.round(candidate.confidence_score)));
  const status = getSubscriptionStatus(candidate.next_estimated_date);
  const shouldShowYearForYearly = candidate.frequency === "yearly";

  return (
    <article className="rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">
            {candidate.merchant_display || candidate.merchant_normalized}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Repeat size={14} />
            <span>{t(`subscriptions.frequency.${candidate.frequency}`)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {t("subscriptions.confidence", { value: confidence })}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}>
            {t(`subscriptions.status.${status}`)}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <p className="text-[var(--text-secondary)]">{t("subscriptions.avgAmount")}</p>
          <p className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(candidate.avg_amount, candidate.currency)} {candidate.currency}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <p className="text-[var(--text-secondary)]">{t("subscriptions.occurrences")}</p>
          <p className="font-semibold text-[var(--text-primary)]">{candidate.occurrences}</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <p className="flex items-center gap-1 text-[var(--text-secondary)]">
            <CalendarClock size={13} />
            {t("subscriptions.lastDate")}
          </p>
          <p className="font-semibold text-[var(--text-primary)]">
            {formatShortDate(candidate.last_date, shouldShowYearForYearly)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <p className="flex items-center gap-1 text-[var(--text-secondary)]">
            <CalendarClock size={13} />
            {t("subscriptions.nextDate")}
          </p>
          <p className="font-semibold text-[var(--text-primary)]">
            {candidate.next_estimated_date
              ? formatShortDate(candidate.next_estimated_date, shouldShowYearForYearly)
              : t("errors.unknownError")}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Mail size={14} />
        {t("subscriptions.sourceConsistency")}:{" "}
        {candidate.source_email_consistent ? t("subscriptions.consistent") : t("subscriptions.variable")}
      </p>
    </article>
  );
}
