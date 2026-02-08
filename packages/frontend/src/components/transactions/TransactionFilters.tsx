import { useTranslation } from "react-i18next";
import {
  X,
  ChevronDown,
  Wallet,
  Mail,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowUpDown,
  LayoutList,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";
import { motion } from "framer-motion";
import { useState } from "react";
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setShowDatePicker(false);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== "all",
  );

  // Helper component for styled selects
  const FilterDropdown = ({
    icon: Icon,
    label,
    value,
    options,
    onChange,
    allLabel,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | undefined;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
    allLabel: string;
  }) => (
    <div className="relative group">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg transition-all w-full sm:w-auto justify-between sm:justify-start ${
          value && value !== "all"
            ? "border-[var(--primary)] text-[var(--primary)] bg-blue-50/50"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <Icon
          size={14}
          className={
            value && value !== "all" ? "text-[var(--primary)]" : "text-gray-500"
          }
        />
        <span className="text-sm font-medium whitespace-nowrap">
          {value && value !== "all"
            ? options.find((o) => o.value === value)?.label || value
            : label}
        </span>
        <ChevronDown
          size={14}
          className={`opacity-50 transition-transform group-hover:translate-y-0.5`}
        />
      </div>
      <select
        value={value || "all"}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="all">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className={`transition-opacity duration-200 ${
        isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Type Filter - Segmented Control Style */}
          <div className="bg-gray-100/80 p-1 rounded-lg flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
            {[
              {
                id: "all",
                label: t("transactions.allTypes"),
                icon: LayoutList,
              },
              {
                id: "income",
                label: t("transactions.income"),
                icon: ArrowDownCircle,
              },
              {
                id: "expense",
                label: t("transactions.expense"),
                icon: ArrowUpCircle,
              },
            ].map((type) => {
              const isActive = (filters.type || "all") === type.id;
              return (
                <Button
                  key={type.id}
                  onClick={() => updateFilter("type", type.id)}
                  variant="outline"
                  size="sm"
                  selected={isActive}
                  className="flex-1 lg:flex-none"
                  icon={<type.icon size={14} />}
                >
                  {type.label}
                </Button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-gray-200 hidden lg:block" />

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Currency */}
            <div className="flex-1 min-w-[140px] sm:flex-none">
              <FilterDropdown
                icon={Wallet}
                label={t("transactions.currency")}
                value={filters.currency}
                allLabel={t("transactions.allCurrencies")}
                onChange={(val) => updateFilter("currency", val)}
                options={availableCurrencies.map((c) => ({ value: c, label: c }))}
              />
            </div>

            {/* Email */}
            <div className="flex-1 min-w-[140px] sm:flex-none">
              <FilterDropdown
                icon={Mail}
                label={t("transactions.email")}
                value={filters.email}
                allLabel={t("transactions.allEmails")}
                onChange={(val) => updateFilter("email", val)}
                options={availableEmails.map((e) => ({ value: e, label: e }))}
              />
            </div>

            {/* Category */}
            <div className="flex-1 min-w-[140px] sm:flex-none">
              <FilterDropdown
                icon={Tag}
                label={t("transactions.category")}
                value={filters.category}
                allLabel={t("transactions.allCategories")}
                onChange={(val) => updateFilter("category", val)}
                options={categories.map((c) => ({
                  value: c,
                  label: t(`categories.${c}`),
                }))}
              />
            </div>

            {/* Sort */}
            <div className="relative group flex-1 min-w-[140px] sm:flex-none">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg transition-all w-full sm:w-auto justify-between sm:justify-start text-gray-700 hover:border-gray-300">
                <ArrowUpDown size={14} className="text-gray-500" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {(filters.sortBy || "created_at") === "created_at"
                    ? t("transactions.newest")
                    : t("transactions.byDate")}
                </span>
                <ChevronDown size={14} className="opacity-50 transition-transform group-hover:translate-y-0.5" />
              </div>
              <select
                value={filters.sortBy || "created_at"}
                onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as TransactionFilters['sortBy'] })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="created_at">{t("transactions.newest")}</option>
                <option value="transaction_date">{t("transactions.byDate")}</option>
              </select>
            </div>

            {/* Date Range Button */}
            <Button
              onClick={() => setShowDatePicker(!showDatePicker)}
              variant="outline"
              size="sm"
              selected={!!(filters.startDate || filters.endDate || showDatePicker)}
              className="flex-1 sm:flex-none"
              icon={<Calendar size={14} />}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {filters.startDate || filters.endDate
                  ? `${filters.startDate || "..."} - ${filters.endDate || "..."}`
                  : t("transactions.dateRange")}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-50 transition-transform ${showDatePicker ? "rotate-180" : ""}`}
              />
            </Button>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                className="w-full sm:w-auto ml-auto lg:ml-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <span>{t("transactions.clearFilters")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Date Picker Panel */}
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center self-start"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                {t("transactions.startDate")}
              </label>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateFilter("startDate", e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div className="hidden md:block text-gray-400">-</div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                {t("transactions.endDate")}
              </label>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateFilter("endDate", e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
