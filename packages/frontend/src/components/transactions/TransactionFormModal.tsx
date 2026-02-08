import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Button } from '../ui/Button';
import { useTranslateCategory } from '../../hooks/useTranslateCategory';
import { getCurrencySymbol } from "../../utils/currency";
import { TRANSACTION_CATEGORIES, TRANSACTION_CURRENCIES } from "../../constants/transactions";
import type { Transaction } from "../../services/transactions.service";

export type TransactionFormData = {
  transaction_type: 'income' | 'expense';
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
  mode: 'create' | 'edit';
  transaction?: Transaction;
  initialData?: TransactionFormData;
}

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
  const [isLoading, setIsLoading] = useState(false);
  
  // Ensure all fields have fallback values - prioritize initialData over transaction data
  const [formData, setFormData] = useState<TransactionFormData>(() => {
    if (initialData) {
      return initialData;
    }
    return {
      transaction_type: transaction?.transaction_type as 'income' | 'expense' || 'expense',
      merchant: transaction?.merchant || '',
      amount: transaction?.amount.toString() || '',
      currency: transaction?.currency || 'USD',
      category: transaction?.category || 'other',
      transaction_date: transaction?.transaction_date || transaction?.date || new Date().toISOString().split('T')[0] as string,
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === 'create' 
    ? t("transactions.addTransaction") 
    : t("transactions.editTransaction");
    
  const saveButtonText = mode === 'create'
    ? t("transactions.create")
    : t("common.save");

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
                  {title}
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
                      setFormData({
                        ...formData,
                        transaction_type: e.target.value as 'income' | 'expense',
                      })
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
                    value={formData.transaction_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
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
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
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
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    {TRANSACTION_CURRENCIES.map((curr) => (
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    {TRANSACTION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {translateCategory(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                    fullWidth
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                    fullWidth
                  >
                    {saveButtonText}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
