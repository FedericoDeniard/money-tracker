import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Receipt } from "lucide-react";
import type { Transaction } from "../../services/transactions.service";
import type { ReportSummary } from "../../types/reports";
import { TransactionCard } from "../transactions/TransactionCard";

const MAX_RECENT = 5;

interface RecentTransactionsProps {
  transactions: Transaction[];
  reportsById?: Map<string, ReportSummary>;
  onSelectTransaction: (transactionId: string) => void;
}

export function RecentTransactions({
  transactions,
  reportsById,
  onSelectTransaction,
}: RecentTransactionsProps) {
  const { t } = useTranslation();

  const recent = useMemo(
    () => transactions.slice(0, MAX_RECENT),
    [transactions]
  );

  if (recent.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          {t("dashboardOverview.recent.title")}
        </h2>
        <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--text-secondary)]">
          <Receipt size={28} className="opacity-60" />
          <p className="text-sm">{t("dashboardOverview.recent.empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          {t("dashboardOverview.recent.title")}
        </h2>
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--button-primary)] hover:underline"
        >
          {t("dashboardOverview.recent.viewAll")}
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-3">
        {recent.map(transaction => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            isSelected={false}
            onClick={() => onSelectTransaction(transaction.id)}
            report={
              transaction.report_id
                ? reportsById?.get(transaction.report_id)
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
