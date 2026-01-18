import {
  Check,
  Copy,
  Edit,
  Trash2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import type { Transaction } from "../../services/transactions.service";
import { getTransactionType } from "../../utils/transactionUtils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { useFormatDate } from "../../hooks/useFormatDate";
import { ConfirmModal } from "../ui/ConfirmModal";
import { EditTransactionModal } from "./EditTransactionModal";

interface TransactionDetailProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
}

export function TransactionDetail({ transaction, onDelete, onUpdate }: TransactionDetailProps) {
  const { t } = useTranslation();
  const { isIncome } = getTransactionType(transaction.transaction_type);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { translateCategory } = useTranslateCategory();
  const { formatDateTime } = useFormatDate();

  const handleCopyId = () => {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(transaction.source_message_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(transaction.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting transaction:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (updates: Partial<Transaction>) => {
    if (!onUpdate) return;
    await onUpdate(transaction.id, updates);
  };

  const amountColor = "text-[var(--text-primary)]";

  // Format date and time
  const dateTimeStr = formatDateTime(
    transaction.transaction_date || transaction.date,
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl p-6 relative shadow-sm border border-gray-100">
      {/* Header with Icon */}
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

      {/* Amount */}
      <div className="text-center mb-3">
        <h1 className={`text-3xl font-bold ${amountColor} tracking-tight`}>
          {isIncome ? "+" : "-"}
          {transaction.currency} {transaction.amount.toLocaleString()}
        </h1>
      </div>

      {/* Context Pill */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-[var(--text-secondary)] shadow-sm">
          <div
            className={`w-2 h-2 rounded-full ${isIncome ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="font-medium text-[var(--text-primary)]">
            {transaction.merchant || t("transactions.unknown")}
          </span>
          <span className="text-gray-300 text-xs">•</span>
          <span className="capitalize">
            {translateCategory(transaction.category)}
          </span>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-6 px-1">
        <DetailRow label={t("transactions.dateTime")} value={dateTimeStr} />

        <DetailRow
          label={t("transactions.type")}
          value={
            isIncome ? t("transactions.income") : t("transactions.expense")
          }
        />

        <DetailRow
          label={
            isIncome
              ? t("transactions.receivedFrom")
              : t("transactions.merchant")
          }
          value={transaction.merchant || t("transactions.unknown")}
        />

        <DetailRow
          label={t("transactions.amount")}
          value={`${transaction.currency} ${transaction.amount.toLocaleString()}`}
        />

        <div className="flex items-center justify-between py-1">
          <span className="text-[var(--text-secondary)] text-sm">
            {t("transactions.reference")}
          </span>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm text-right overflow-hidden pl-4">
            <span className="truncate w-32 md:w-40 font-mono text-xs opacity-70">
              {transaction.source_message_id}
            </span>
            <button
              onClick={handleCopyId}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-gray-100 rounded"
              title={t("common.copy")}
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto pt-8">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            {t("transactions.delete")}
          </button>
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gray-50 text-[var(--text-primary)] font-medium text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <Edit size={16} />
            {t("transactions.edit")}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t("transactions.deleteTransaction")}
        message={t("transactions.deleteConfirmation")}
        confirmText={t("transactions.delete")}
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdate}
        transaction={transaction}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
      <span className="text-[var(--text-primary)] font-medium text-sm text-right">
        {value}
      </span>
    </div>
  );
}
