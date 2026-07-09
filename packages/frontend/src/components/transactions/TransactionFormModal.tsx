import { useTranslation } from "react-i18next";
import { useId, useState, useTransition } from "react";
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
import { TagSelector } from "../tags/TagSelector";

export type TransactionFormData = {
  name: string;
  transaction_type: "income" | "expense";
  merchant: string;
  transaction_description: string;
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
  initialTagIds?: string[];
  onTagsChange?: (ids: string[]) => void;
}

const FORM_ID = "transaction-form";
const EMPTY_TAG_IDS: string[] = [];

interface TransactionFormFieldsProps {
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  isPending: boolean;
  selectedTagIds: string[];
  onTagsChange: (ids: string[]) => void;
}

function TransactionFormFields({
  formData,
  setFormData,
  isPending,
  selectedTagIds,
  onTagsChange,
}: TransactionFormFieldsProps) {
  const { t } = useTranslation();
  const { translateCategory } = useTranslateCategory();
  const typeId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const merchantId = useId();
  const dateId = useId();
  const amountId = useId();
  const currencyId = useId();
  const categoryId = useId();
  const tagsId = useId();

  return (
    <div className="space-y-4">
      {/* Type */}
      <div>
        <label
          htmlFor={typeId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.type")}
        </label>
        <select
          id={typeId}
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

      {/* Name */}
      <div>
        <label
          htmlFor={nameId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.name")}
        </label>
        <input
          id={nameId}
          type="text"
          value={formData.name}
          onChange={e =>
            setFormData(prev => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
          disabled={isPending}
          maxLength={255}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor={descriptionId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.description")}
        </label>
        <textarea
          id={descriptionId}
          value={formData.transaction_description}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              transaction_description: e.target.value,
            }))
          }
          rows={2}
          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:border-[var(--primary)] focus:outline-none transition-colors resize-none"
          disabled={isPending}
          maxLength={500}
          required
        />
      </div>

      {/* Merchant */}
      <div>
        <label
          htmlFor={merchantId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.merchant")}
        </label>
        <input
          id={merchantId}
          type="text"
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
        <label
          htmlFor={dateId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.date")}
        </label>
        <input
          id={dateId}
          type="date"
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
        <label
          htmlFor={amountId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.amount")}
        </label>
        <input
          id={amountId}
          type="number"
          step="0.01"
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
        <label
          htmlFor={currencyId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.currency")}
        </label>
        <select
          id={currencyId}
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
        <label
          htmlFor={categoryId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("transactions.category")}
        </label>
        <select
          id={categoryId}
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

      {/* Tags */}
      <div>
        <label
          htmlFor={tagsId}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
        >
          {t("tags.title", "Tags")}
        </label>
        <TagSelector
          id={tagsId}
          mode="assign"
          value={selectedTagIds}
          onChange={onTagsChange}
          disabled={isPending}
        />
      </div>
    </div>
  );
}

export function TransactionFormModal({
  isOpen,
  onClose,
  onSave,
  mode,
  transaction,
  initialData,
  initialTagIds = EMPTY_TAG_IDS,
  onTagsChange,
}: TransactionFormModalProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<TransactionFormData>(() => {
    if (initialData) return initialData;
    return {
      name: transaction?.name || "",
      transaction_type:
        (transaction?.transaction_type as "income" | "expense") || "expense",
      merchant: transaction?.merchant || "",
      transaction_description: transaction?.transaction_description || "",
      amount: transaction?.amount.toString() || "",
      currency: transaction?.currency || "USD",
      category: transaction?.category || "other",
      transaction_date:
        transaction?.transaction_date ||
        transaction?.date ||
        (new Date().toISOString().split("T")[0] as string),
    };
  });

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);

  const handleTagsChange = (ids: string[]) => {
    setSelectedTagIds(ids);
    onTagsChange?.(ids);
  };

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
        <TransactionFormFields
          formData={formData}
          setFormData={setFormData}
          isPending={isPending}
          selectedTagIds={selectedTagIds}
          onTagsChange={handleTagsChange}
        />
      </form>
    </Modal>
  );
}
