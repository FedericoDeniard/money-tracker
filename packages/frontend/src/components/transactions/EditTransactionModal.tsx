import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { Transaction } from "../../services/transactions.service";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Transaction>) => Promise<void>;
  transaction: Transaction;
}

const CATEGORIES = [
  "salary",
  "entertainment",
  "investment",
  "food",
  "transport",
  "services",
  "health",
  "education",
  "housing",
  "clothing",
  "other",
] as const;

export function EditTransactionModal({
  isOpen,
  onClose,
  onSave,
  transaction,
}: EditTransactionModalProps) {
  const { t } = useTranslation();
  const { translateCategory } = useTranslateCategory();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    transaction_type: transaction.transaction_type,
    merchant: transaction.merchant || "",
    amount: transaction.amount.toString(),
    category: transaction.category,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave({
        transaction_type: formData.transaction_type,
        merchant: formData.merchant,
        amount: parseFloat(formData.amount),
        category: formData.category,
      });
      onClose();
    } catch (error) {
      console.error("Error updating transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {t("transactions.editTransaction")}
                </h2>
                <button
                  onClick={onClose}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  disabled={isLoading}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t("transactions.type")}
                  </label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) =>
                      setFormData({ ...formData, transaction_type: e.target.value as "income" | "expense" })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
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
                    value={formData.merchant}
                    onChange={(e) =>
                      setFormData({ ...formData, merchant: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
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
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t("transactions.category")}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as typeof CATEGORIES[number] })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {translateCategory(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-[var(--text-primary)] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? t("common.loading") : t("common.save")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
