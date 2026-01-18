import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export interface FilterBarProps {
  selectedPeriod: "30" | "90" | "365";
  selectedCurrency: string;
  availableCurrencies: string[];
  onPeriodChange: (period: "30" | "90" | "365") => void;
  onCurrencyChange: (currency: string) => void;
}

export function FilterBar({
  selectedPeriod,
  selectedCurrency,
  availableCurrencies,
  onPeriodChange,
  onCurrencyChange,
}: FilterBarProps) {
  const { t } = useTranslation();

  const periods = [
    { value: "30", label: t("metrics.last30Days") },
    { value: "90", label: t("metrics.last90Days") },
    { value: "365", label: t("metrics.lastYear") },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
      {/* Currency Selector */}
      <div className="flex gap-2">
        <motion.select
          value={selectedCurrency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-transparent hover:border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer transition-all appearance-none"
          whileFocus={{ scale: 1.01 }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <option value="all">{t("metrics.allCurrencies")}</option>
          {availableCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </motion.select>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl overflow-x-auto sm:overflow-visible">
        {periods.map((period) => {
          const isSelected = selectedPeriod === period.value;
          return (
            <button
              key={period.value}
              onClick={() =>
                onPeriodChange(period.value as "30" | "90" | "365")
              }
              className={`relative flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                isSelected
                  ? "text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activePeriod"
                  className="absolute inset-0 bg-[var(--primary)] rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{period.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
