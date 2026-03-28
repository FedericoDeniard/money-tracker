import { Suspense, useEffect, useState } from "react";
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
  Search,
} from "lucide-react";
import { Button } from "../ui/Button";
import { motion } from "framer-motion";
import type { TransactionFilters } from "../../services/transactions.service";
import { useTransactionFilters } from "../../hooks/useTransactionFilters";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: string[];
  isLoading?: boolean;
}

// ─── Dynamic dropdowns — suspends while currencies/emails load ───────────────
interface DynamicDropdownsProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

function DynamicFilterDropdowns({
  filters,
  onFiltersChange,
}: DynamicDropdownsProps) {
  const { t } = useTranslation();
  const { currencies: availableCurrencies, emails: availableEmails } =
    useTransactionFilters();

  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    const normalizedValue =
      value === "all" || value.trim() === "" ? undefined : value;
    onFiltersChange({ ...filters, [key]: normalizedValue });
  };

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
        className={`flex items-center gap-2 px-3 py-1.5 md:py-2 bg-white border rounded-lg transition-all w-full sm:w-auto justify-between sm:justify-start h-8 md:h-9 ${
          value && value !== "all"
            ? "border-[var(--primary)] text-[var(--primary)] bg-blue-50/50"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <Icon
          size={14}
          className={`shrink-0 ${value && value !== "all" ? "text-[var(--primary)]" : "text-gray-500"}`}
        />
        <span className="text-xs md:text-sm font-medium whitespace-nowrap truncate">
          {value && value !== "all"
            ? options.find(o => o.value === value)?.label || value
            : label}
        </span>
        <ChevronDown
          size={14}
          className="opacity-50 transition-transform group-hover:translate-y-0.5 ml-auto"
        />
      </div>
      <select
        value={value || "all"}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="all">{allLabel}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="flex-1 min-w-[120px] sm:flex-none">
        <FilterDropdown
          icon={Wallet}
          label={t("transactions.currency")}
          value={filters.currency}
          allLabel={t("transactions.allCurrencies")}
          onChange={val => updateFilter("currency", val)}
          options={availableCurrencies.map(c => ({ value: c, label: c }))}
        />
      </div>
      <div className="flex-1 min-w-[120px] sm:flex-none">
        <FilterDropdown
          icon={Mail}
          label={t("transactions.email")}
          value={filters.email}
          allLabel={t("transactions.allEmails")}
          onChange={val => updateFilter("email", val)}
          options={availableEmails.map(e => ({ value: e, label: e }))}
        />
      </div>
    </>
  );
}

// Skeleton for the dynamic dropdowns while they load
function DynamicDropdownsSkeleton() {
  return (
    <>
      <div className="h-8 md:h-9 w-28 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
      <div className="h-8 md:h-9 w-36 rounded-lg bg-[var(--bg-secondary)] animate-pulse" />
    </>
  );
}

// ─── Main filter component ───────────────────────────────────────────────────
export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  categories,
  isLoading = false,
}: TransactionFiltersProps) {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [serviceSearch, setServiceSearch] = useState(filters.serviceName || "");

  const updateFilter = (key: keyof TransactionFilters, value: string) => {
    const normalizedValue =
      value === "all" || value.trim() === "" ? undefined : value;
    onFiltersChange({ ...filters, [key]: normalizedValue });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setShowDatePicker(false);
    setServiceSearch("");
  };

  useEffect(() => {
    setServiceSearch(filters.serviceName || "");
  }, [filters.serviceName]);

  useEffect(() => {
    const normalized =
      serviceSearch.trim() === "" ? undefined : serviceSearch.trim();
    if (normalized === filters.serviceName) return;
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, serviceName: normalized });
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [serviceSearch, filters, onFiltersChange]);

  const hasActiveFilters = Object.values(filters).some(
    value => value !== undefined && value !== "all"
  );

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
        className={`flex items-center gap-2 px-3 py-1.5 md:py-2 bg-white border rounded-lg transition-all w-full sm:w-auto justify-between sm:justify-start h-8 md:h-9 ${
          value && value !== "all"
            ? "border-[var(--primary)] text-[var(--primary)] bg-blue-50/50"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <Icon
          size={14}
          className={`shrink-0 ${value && value !== "all" ? "text-[var(--primary)]" : "text-gray-500"}`}
        />
        <span className="text-xs md:text-sm font-medium whitespace-nowrap truncate">
          {value && value !== "all"
            ? options.find(o => o.value === value)?.label || value
            : label}
        </span>
        <ChevronDown
          size={14}
          className="opacity-50 transition-transform group-hover:translate-y-0.5 ml-auto"
        />
      </div>
      <select
        value={value || "all"}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        <option value="all">{allLabel}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section
      className={`rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm transition-opacity duration-200 ${
        isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        {/* Title & Description — renders immediately */}
        <div className="shrink-0 mb-2 xl:mb-0">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {t("navigation.transactions")}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] line-clamp-2 md:line-clamp-none">
            {t(
              "transactions.pageDescription",
              "View and manage all your income and expenses in one place."
            )}
          </p>
        </div>

        {/* Filters Group */}
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-end xl:flex-1 shrink-0">
          <div className="flex flex-row flex-wrap gap-2 items-center justify-start xl:justify-end w-full xl:w-auto">
            {/* Service Name Search — static */}
            <div className="relative flex-1 min-w-[140px] sm:flex-none">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                placeholder={t("transactions.serviceNamePlaceholder")}
                className="w-full sm:w-[180px] pl-9 pr-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-lg text-xs md:text-sm h-8 md:h-9 text-gray-700 placeholder:text-gray-500 focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Date Range — static */}
            <Button
              onClick={() => setShowDatePicker(!showDatePicker)}
              variant="outline"
              size="sm"
              selected={
                !!(filters.startDate || filters.endDate || showDatePicker)
              }
              className="flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 px-2 md:px-3"
              icon={<Calendar size={14} />}
            >
              <span className="text-xs md:text-sm font-medium whitespace-nowrap">
                {filters.startDate || filters.endDate
                  ? `${filters.startDate || "..."} - ${filters.endDate || "..."}`
                  : t("transactions.dateRange")}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-50 transition-transform ${showDatePicker ? "rotate-180" : ""}`}
              />
            </Button>

            {/* Type Filter — static */}
            <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-1 w-full sm:w-auto overflow-x-auto shrink-0">
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
              ].map(type => {
                const isActive = (filters.type || "all") === type.id;
                return (
                  <Button
                    key={type.id}
                    onClick={() => updateFilter("type", type.id)}
                    variant="outline"
                    size="sm"
                    selected={isActive}
                    className="flex-1 sm:flex-none text-xs md:text-sm h-8 px-2 md:px-3 whitespace-nowrap"
                    icon={<type.icon size={14} />}
                  >
                    {type.label}
                  </Button>
                );
              })}
            </div>

            {/* Category — static */}
            <div className="flex-1 min-w-[120px] sm:flex-none">
              <FilterDropdown
                icon={Tag}
                label={t("transactions.category")}
                value={filters.category}
                allLabel={t("transactions.allCategories")}
                onChange={val => updateFilter("category", val)}
                options={categories.map(c => ({
                  value: c,
                  label: t(`categories.${c}`),
                }))}
              />
            </div>

            {/* Sort — static */}
            <div className="relative group flex-1 min-w-[120px] sm:flex-none">
              <div className="flex items-center gap-2 px-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-lg transition-all w-full text-gray-700 hover:border-gray-300 h-8 md:h-9">
                <ArrowUpDown size={14} className="text-gray-500 shrink-0" />
                <span className="text-xs md:text-sm font-medium whitespace-nowrap truncate">
                  {(filters.sortBy || "created_at") === "created_at"
                    ? t("transactions.newest")
                    : t("transactions.byDate")}
                </span>
                <ChevronDown
                  size={14}
                  className="opacity-50 transition-transform group-hover:translate-y-0.5 ml-auto"
                />
              </div>
              <select
                value={filters.sortBy || "created_at"}
                onChange={e =>
                  onFiltersChange({
                    ...filters,
                    sortBy: e.target.value as TransactionFilters["sortBy"],
                  })
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="created_at">{t("transactions.newest")}</option>
                <option value="transaction_date">
                  {t("transactions.byDate")}
                </option>
              </select>
            </div>

            {/* Currency + Email — dynamic, suspends while data loads */}
            <Suspense fallback={<DynamicDropdownsSkeleton />}>
              <DynamicFilterDropdowns
                filters={filters}
                onFiltersChange={onFiltersChange}
              />
            </Suspense>

            {/* Clear Filters — static */}
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                icon={<X size={14} />}
                className="w-full sm:w-auto text-red-600 hover:bg-red-50 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm shrink-0 flex items-center justify-center gap-1.5 rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">
                  {t("transactions.clearFilters")}
                </span>
              </Button>
            )}
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
                  onChange={e => updateFilter("startDate", e.target.value)}
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
                  onChange={e => updateFilter("endDate", e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
