import { useTranslation } from "react-i18next";
import { useState, useTransition } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "../../utils/toast";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { getCurrencySymbol } from "../../utils/currency";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CURRENCIES,
} from "../../constants/transactions";
import type { Transaction } from "../../services/transactions.service";

export type TransactionFormData = {
  transaction_type: "income" | "expense";
  merchant: string;
  amount: string;
  currency: string;
  category: string;
  transaction_date: string;
};

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  mode: "create" | "edit";
  transaction?: Transaction;
  initialData?: TransactionFormData;
}

const FORM_ID = "transaction-form";

export function TransactionFormModal({
  isOpen,
  onClose,
  onSave,
  mode,
  transaction,
  initialData,
}: TransactionFormModalProps) {
  const { t } = useTranslation();
  const { translateCategory } = useTranslateCategory();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<TransactionFormData>(() => {
    if (initialData) return initialData;
    return {
      transaction_type:
        (transaction?.transaction_type as "income" | "expense") || "expense",
      merchant: transaction?.merchant || "",
      amount: transaction?.amount.toString() || "",
      currency: transaction?.currency || "USD",
      category: transaction?.category || "other",
      transaction_date:
        transaction?.transaction_date ||
        transaction?.date ||
        (new Date().toISOString().split("T")[0] as string),
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await onSave(formData);
        const successKey =
          mode === "create"
            ? "transactions.createSuccess"
            : "transactions.updateSuccess";
        toast.success(t(successKey));
        onClose();
      } catch (error) {
        console.error("Error saving transaction:", error);
        const errorKey =
          mode === "create"
            ? "transactions.createError"
            : "transactions.updateError";
        toast.error(t(errorKey));
      }
    });
  };

  const title =
    mode === "create"
      ? t("transactions.addTransaction")
      : t("transactions.editTransaction");

  const saveButtonText =
    mode === "create" ? t("transactions.create") : t("common.save");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeDisabled={isPending}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            fullWidth
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            loading={isPending}
            fullWidth
          >
            {saveButtonText}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.type")}
          </label>
          <select
            value={formData.transaction_type}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                transaction_type: e.target.value as "income" | "expense",
              }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
          >
            <option value="income">{t("transactions.income")}</option>
            <option value="expense">{t("transactions.expense")}</option>
          </select>
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.merchant")}
          </label>
          <input
            type="text"
            aria-label={t("transactions.merchant")}
            value={formData.merchant}
            onChange={e =>
              setFormData(prev => ({ ...prev, merchant: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.date")}
          </label>
          <input
            type="date"
            aria-label={t("transactions.date")}
            value={formData.transaction_date}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                transaction_date: e.target.value,
              }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.amount")}
          </label>
          <input
            type="number"
            step="0.01"
            aria-label={t("transactions.amount")}
            min="0.01"
            value={formData.amount}
            onChange={e =>
              setFormData(prev => ({ ...prev, amount: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
            required
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.currency")}
          </label>
          <select
            value={formData.currency}
            onChange={e =>
              setFormData(prev => ({ ...prev, currency: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
          >
            {TRANSACTION_CURRENCIES.map(curr => (
              <option key={curr} value={curr}>
                {getCurrencySymbol(curr)} {curr}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            {t("transactions.category")}
          </label>
          <select
            value={formData.category}
            onChange={e =>
              setFormData(prev => ({ ...prev, category: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
            disabled={isPending}
          >
            {TRANSACTION_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {translateCategory(cat)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
