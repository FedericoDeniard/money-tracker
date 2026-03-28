import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { Transaction } from "../../services/transactions.service";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { getCurrencySymbol } from "../../utils/currency";

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

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "INR",
  "AUD",
  "CAD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "RUB",
  "TRY",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "BOB",
  "PYG",
  "ILS",
  "KRW",
  "THB",
  "VND",
  "IDR",
  "MYR",
  "PHP",
  "SGD",
  "HKD",
  "NZD",
  "ZAR",
  "NGN",
  "GHS",
  "KES",
  "EGP",
  "MAD",
  "TND",
  "DZD",
  "LBP",
  "JOD",
  "IQD",
  "BHD",
  "KWD",
  "QAR",
  "SAR",
  "AED",
  "OMR",
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
    currency: transaction.currency,
    category: transaction.category,
    transaction_date: transaction.transaction_date || transaction.date,
  });

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      transaction_type: transaction.transaction_type,
      merchant: transaction.merchant || "",
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      category: transaction.category,
      transaction_date: transaction.transaction_date || transaction.date,
    });
  }, [transaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave({
        transaction_type: formData.transaction_type,
        merchant: formData.merchant,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        transaction_date: formData.transaction_date,
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
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {t("transactions.editTransaction")}
                </h2>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  icon={<X size={20} />}
                  disabled={isLoading}
                />
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
                    onChange={e =>
                      setFormData({
                        ...formData,
                        transaction_type: e.target.value as
                          | "income"
                          | "expense",
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
                    onChange={e =>
                      setFormData({ ...formData, merchant: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
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
                    onChange={e =>
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
                    min="0.01"
                    value={formData.amount}
                    onChange={e =>
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
                    onChange={e =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    {CURRENCIES.map(curr => (
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
                      setFormData({
                        ...formData,
                        category: e.target.value as (typeof CATEGORIES)[number],
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[var(--primary)] focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {translateCategory(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={onClose}
                    variant="secondary"
                    size="md"
                    disabled={isLoading}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    variant="primary"
                    size="md"
                  >
                    {isLoading ? t("common.saving") : t("common.save")}
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
