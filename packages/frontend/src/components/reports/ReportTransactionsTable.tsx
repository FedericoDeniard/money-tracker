import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../utils/currency";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { useFormatDate } from "../../hooks/useFormatDate";
import type { ReportTransactionListItem } from "../../types/reports";

interface ReportTransactionsTableProps {
  items: ReportTransactionListItem[];
  total: number;
}

export function ReportTransactionsTable({
  items,
  total,
}: ReportTransactionsTableProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-8 text-center">
        <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
          {t("reports.noTransactions", "No transactions in this report yet")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t(
            "reports.noTransactionsDescription",
            "Assign transactions from the list page or from a transaction's detail view."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-[var(--text-secondary)] bg-[var(--bg-secondary)]">
            <tr>
              <th scope="col" className="text-left px-4 py-3 font-medium">
                {t("transactions.date", "Date")}
              </th>
              <th scope="col" className="text-left px-4 py-3 font-medium">
                {t("transactions.name", "Name")}
              </th>
              <th scope="col" className="text-left px-4 py-3 font-medium">
                {t("transactions.merchant", "Merchant")}
              </th>
              <th scope="col" className="text-left px-4 py-3 font-medium">
                {t("transactions.category", "Category")}
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                {t("transactions.amount", "Amount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <TransactionRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--text-secondary)]/10 px-4 py-2 text-xs text-[var(--text-secondary)]">
        {t("reports.summary.count", {
          count: total,
          defaultValue: "{{count}} transactions",
        })}
      </div>
    </div>
  );
}

function TransactionRow({ item }: { item: ReportTransactionListItem }) {
  const { translateCategory } = useTranslateCategory();
  const { formatShortDate } = useFormatDate();

  const isIncome =
    item.transactionType === "income" || item.transactionType === "ingreso";

  return (
    <tr className="border-t border-[var(--text-secondary)]/10">
      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
        {formatShortDate(item.transactionDate)}
      </td>
      <td className="px-4 py-3 text-[var(--text-primary)] font-medium truncate max-w-[16rem]">
        {item.name || item.merchant}
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)] truncate max-w-[14rem]">
        {item.merchant}
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">
        {translateCategory(item.category)}
      </td>
      <td
        className={cn(
          "px-4 py-3 text-right tabular-nums whitespace-nowrap font-medium",
          isIncome ? "text-emerald-700" : "text-rose-700"
        )}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {isIncome ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {formatCurrency(item.amount, item.currency)}
        </span>
      </td>
    </tr>
  );
}
