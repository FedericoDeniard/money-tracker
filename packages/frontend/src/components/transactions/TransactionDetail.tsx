import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, X } from "lucide-react";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionAttachments } from "./TransactionAttachments";
import { ReportSelector } from "../reports/ReportSelector";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMetadata } from "./TransactionDetailMetadata";
import { TransactionDetailTags } from "./TransactionDetailTags";
import { useTagMutations } from "../../hooks/useTagMutations";
import { useTags } from "../../hooks/useTags";
import { useReportMutations } from "../../hooks/useReportMutations";
import type { Transaction } from "../../services/transactions.service";

interface TransactionDetailProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onClose?: () => void;
}

export function TransactionDetail({
  transaction,
  onDelete,
  onUpdate,
  onClose,
}: TransactionDetailProps) {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setTransactionTags, isSettingTransactionTags } = useTagMutations();
  const { data: allTags = [] } = useTags();
  const { assignTransactionToReport, isAssigning } = useReportMutations();

  const handleChangeTags = async (ids: string[]) => {
    try {
      await setTransactionTags({
        transactionId: transaction.id,
        tagIds: ids,
      });
    } catch (error) {
      console.error("Error updating transaction tags:", error);
    }
  };

  const handleAssignReport = async (reportId: string | null) => {
    try {
      await assignTransactionToReport({
        transactionId: transaction.id,
        reportId,
      });
    } catch (error) {
      console.error("Failed to assign transaction to report:", error);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(transaction.id);
      setShowDeleteModal(false);
      onClose?.();
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

  // The selected tag ids are derived from the transaction prop. The mutation's
  // onMutate already pushes optimistic updates into the transactions cache,
  // so the prop is the source of truth — no local mirror needed.
  const selectedTagIds = transaction.tags?.map(tag => tag.id) ?? [];

  return (
    <div className="h-full flex flex-col bg-white lg:rounded-3xl relative lg:shadow-sm lg:border border-zinc-100">
      {onClose && (
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="sm"
          icon={<X size={20} />}
          className="lg:hidden absolute top-4 right-4 z-10"
          aria-label={t("common.close")}
        />
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <TransactionDetailHeader transaction={transaction} />

        <div className="space-y-6 px-1 mt-4">
          <TransactionDetailMetadata transaction={transaction} />
        </div>

        <div className="mt-6 px-1">
          <TransactionDetailTags
            label={t("tags.title", "Tags")}
            selectedIds={selectedTagIds}
            allTags={allTags}
            disabled={isSettingTransactionTags}
            onChange={handleChangeTags}
          />
        </div>

        <div className="mt-4 px-1">
          <ReportSelector
            label={t("reports.title", "Report")}
            value={transaction.report_id ?? null}
            disabled={isAssigning}
            onChange={handleAssignReport}
          />
        </div>

        <TransactionAttachments transactionId={transaction.id} />
      </div>

      <div className="shrink-0 p-6 pt-4 border-t border-zinc-100">
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            variant="danger"
            size="md"
            icon={<Trash2 size={16} />}
            fullWidth
          >
            {t("transactions.delete")}
          </Button>
          <Button
            type="button"
            onClick={() => setShowEditModal(true)}
            variant="secondary"
            size="md"
            icon={<Edit size={16} />}
            fullWidth
          >
            {t("transactions.edit")}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t("transactions.deleteTransaction")}
        message={t("transactions.deleteConfirmation")}
        confirmText={t("transactions.delete")}
        isDestructive
        isLoading={isDeleting}
      />

      <EditTransactionModal
        key={transaction.id}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdate}
        transaction={transaction}
      />
    </div>
  );
}
