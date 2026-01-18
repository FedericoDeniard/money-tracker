import { useTranslation } from "react-i18next";
import { Filter, X } from "lucide-react";
import type { TransactionFilters } from "../../services/transactions.service";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  availableCurrencies: string[];
  availableEmails: string[];
  categories: string[];
  isLoading?: boolean;
}

export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  availableCurrencies,
  availableEmails,
  categories,
  isLoading = false,
}: TransactionFiltersProps) {
  const { t } = useTranslation();

  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== "all",
  );

  return (
    <div
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 transition-opacity ${
        isLoading ? "opacity-75" : "opacity-100"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {t("transactions.filters")}
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
            {t("transactions.clearFilters")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Currency Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("transactions.currency")}
          </label>
          <select
            value={filters.currency || "all"}
            onChange={(e) => updateFilter("currency", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("transactions.allCurrencies")}</option>
            {availableCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        {/* Email Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("transactions.email")}
          </label>
          <select
            value={filters.email || "all"}
            onChange={(e) => updateFilter("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("transactions.allEmails")}</option>
            {availableEmails.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("transactions.category")}
          </label>
          <select
            value={filters.category || "all"}
            onChange={(e) => updateFilter("category", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("transactions.allCategories")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("transactions.type")}
          </label>
          <select
            value={filters.type || "all"}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t("transactions.allTypes")}</option>
            <option value="income">{t("transactions.income")}</option>
            <option value="expense">{t("transactions.expense")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
