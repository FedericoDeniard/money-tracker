import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { DetailRow } from "./DetailRow";
import { useFormatDate } from "../../hooks/useFormatDate";
import { getTransactionType } from "../../utils/transactionUtils";
import type { Transaction } from "../../services/transactions.service";

interface TransactionDetailMetadataProps {
  transaction: Transaction;
}

export function TransactionDetailMetadata({
  transaction,
}: TransactionDetailMetadataProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatDate();
  const [copied, setCopied] = useState(false);

  const { isIncome } = getTransactionType(
    transaction.transaction_type as "income" | "expense" | "ingreso" | "egreso"
  );

  const dateTime = (() => {
    try {
      return formatDateTime(transaction.transaction_date || transaction.date);
    } catch {
      return "Invalid date";
    }
  })();

  const amountDisplay = (() => {
    try {
      return transaction.amount.toLocaleString();
    } catch {
      return "error";
    }
  })();

  const handleCopyId = () => {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(transaction.source_message_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <DetailRow label={t("transactions.dateTime")} value={dateTime} />

      <DetailRow
        label={t("transactions.type")}
        value={isIncome ? t("transactions.income") : t("transactions.expense")}
      />

      <DetailRow
        label={
          isIncome ? t("transactions.receivedFrom") : t("transactions.merchant")
        }
        value={transaction.merchant || t("transactions.unknown")}
      />

      <DetailRow
        label={t("transactions.description")}
        value={transaction.transaction_description}
      />

      <DetailRow
        label={t("transactions.amount")}
        value={`${transaction.currency} ${amountDisplay}`}
      />

      <div className="flex items-center justify-between py-1">
        <span className="text-[var(--text-secondary)] text-sm">
          {t("transactions.reference")}
        </span>
        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm text-right overflow-hidden pl-4">
          <span className="truncate w-32 md:w-40 font-mono text-xs opacity-70">
            {transaction.source_message_id}
          </span>
          <Button
            type="button"
            onClick={handleCopyId}
            variant="ghost"
            size="sm"
            icon={
              copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )
            }
            aria-label={t("common.copy")}
            title={t("common.copy")}
          />
        </div>
      </div>
    </>
  );
}
