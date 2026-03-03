import { Repeat, CalendarClock, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormatDate } from "../../hooks/useFormatDate";
import type { SubscriptionCandidate } from "../../services/transactions.service";
import { formatCurrency } from "../../utils/currency";

function getConfidenceClass(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

interface SubscriptionCardProps {
  candidate: SubscriptionCandidate;
}

export function SubscriptionCard({ candidate }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const { formatShortDate } = useFormatDate();
  const confidence = Math.min(100, Math.max(0, Math.round(candidate.confidence_score)));

  return (
    <article className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {candidate.merchant_display || candidate.merchant_normalized}
        </h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getConfidenceClass(confidence)}`}>
          {t("subscriptions.confidence", { value: confidence })}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Repeat size={16} />
        <span>{t(`subscriptions.frequency.${candidate.frequency}`)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
      </div>

      <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
        <p className="flex items-center gap-2">
          <CalendarClock size={14} />
          {t("subscriptions.lastDate")}: {formatShortDate(candidate.last_date)}
        </p>
        <p className="flex items-center gap-2">
          <CalendarClock size={14} />
          {t("subscriptions.nextDate")}:{" "}
          {candidate.next_estimated_date
            ? formatShortDate(candidate.next_estimated_date)
            : t("errors.unknownError")}
        </p>
        <p className="flex items-center gap-2">
          <Mail size={14} />
          {t("subscriptions.sourceConsistency")}:{" "}
          {candidate.source_email_consistent
            ? t("subscriptions.consistent")
            : t("subscriptions.variable")}
        </p>
      </div>
    </article>
  );
}
