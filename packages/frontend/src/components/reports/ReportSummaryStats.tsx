import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";
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
        No transactions yet
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {perCurrency.map(bucket => (
        <CurrencyStatBlock key={bucket.currency} bucket={bucket} />
      ))}
    </div>
  );
}

function CurrencyStatBlock({ bucket }: { bucket: ReportCurrencySummary }) {
  const { t } = useTranslation();
  if (!bucket.currency) return null;
  const positive = bucket.net >= 0;

  return (
    <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)] font-mono">
          {bucket.currency}
        </span>
        <Wallet size={14} className="text-[var(--text-secondary)]" />
      </div>
      <StatRow
        icon={<ArrowUp size={14} className="text-emerald-600" />}
        label={t("reports.summary.income", "Income")}
        value={formatCurrency(bucket.totalIncome, bucket.currency)}
        tone="positive"
      />
      <StatRow
        icon={<ArrowDown size={14} className="text-rose-600" />}
        label={t("reports.summary.expenses", "Expenses")}
        value={formatCurrency(bucket.totalExpenses, bucket.currency)}
        tone="negative"
      />
      <div className="border-t border-[var(--text-secondary)]/10 pt-3">
        <StatRow
          icon={null}
          label={t("reports.summary.net", "Net")}
          value={formatCurrency(bucket.net, bucket.currency)}
          tone={positive ? "positive" : "negative"}
          emphasize
        />
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        {t("reports.summary.count", {
          count: bucket.transactionCount,
          defaultValue: "{{count}} transactions",
        })}
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  tone,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "positive" | "negative";
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={cn(
          "tabular-nums",
          emphasize ? "text-base font-semibold" : "text-sm font-medium",
          tone === "positive" ? "text-emerald-700" : "text-rose-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}
