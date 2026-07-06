import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTransactionType } from "../../utils/transactionUtils";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import type { Transaction } from "../../services/transactions.service";

interface TransactionDetailHeaderProps {
  transaction: Transaction;
}

export function TransactionDetailHeader({
  transaction,
}: TransactionDetailHeaderProps) {
  const { t } = useTranslation();
  const { translateCategory } = useTranslateCategory();
  const { isIncome } = getTransactionType(
    transaction.transaction_type as "income" | "expense" | "ingreso" | "egreso"
  );

  const amountDisplay = (() => {
    try {
      return transaction.amount.toLocaleString();
    } catch {
      return "error";
    }
  })();

  return (
    <>
      <div className="flex justify-center mb-6 mt-2">
        <div
          className={`p-4 rounded-2xl ${
            isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {isIncome ? (
            <ArrowDown strokeWidth={3} size={32} />
          ) : (
            <ArrowUp strokeWidth={3} size={32} />
          )}
        </div>
      </div>

      <div className="text-center mb-3">
        <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
          {isIncome ? "+" : "-"}
          {transaction.currency} {amountDisplay}
        </h1>
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-full text-sm text-[var(--text-secondary)] shadow-sm">
          <div
            className={`size-2 rounded-full ${isIncome ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="font-medium text-[var(--text-primary)]">
            {transaction.merchant || t("transactions.unknown")}
          </span>
          <span className="text-zinc-300 text-xs">•</span>
          <span className="capitalize">
            {translateCategory(transaction.category)}
          </span>
        </div>
      </div>
    </>
  );
}
