import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../utils/currency";
import type { ReportCurrencySummary } from "../../types/reports";

interface ReportSummaryStatsProps {
  perCurrency: ReportCurrencySummary[];
}

export function ReportSummaryStats({ perCurrency }: ReportSummaryStatsProps) {
  if (perCurrency.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-6 text-center text-sm text-[var(--text-secondary)]">
        {""}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {perCurrency.map(bucket => (
        <CurrencyStatBlock key={bucket.currency} bucket={bucket} />
      ))}
    </div>
  );
}

function CurrencyStatBlock({ bucket }: { bucket: ReportCurrencySummary }) {
  const { t } = useTranslation();
  if (!bucket.currency) return null;

  return (
    <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {bucket.currency}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {t("reports.summary.count", {
            count: bucket.transactionCount,
            defaultValue: "{{count}} transactions",
          })}
        </span>
      </div>

      <div className="space-y-2">
        <StatRow
          label={t("reports.summary.income", "Income")}
          value={formatCurrency(bucket.totalIncome, bucket.currency)}
        />
        <StatRow
          label={t("reports.summary.expenses", "Expenses")}
          value={formatCurrency(bucket.totalExpenses, bucket.currency)}
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--text-secondary)]/15">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {t("reports.summary.net", "Net")}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            bucket.net >= 0 ? "text-emerald-700" : "text-rose-700"
          )}
        >
          {formatCurrency(bucket.net, bucket.currency)}
        </span>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
        {value}
      </span>
    </div>
  );
}
