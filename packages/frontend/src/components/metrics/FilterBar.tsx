import { motion } from "framer-motion";
import { Button } from "../ui/Button";
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
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto items-stretch sm:items-center">
      {/* Currency Selector */}
      <div className="flex gap-2">
        <motion.select
          value={selectedCurrency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-transparent hover:border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer transition-all appearance-none h-8 md:h-9"
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
      <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg overflow-x-auto sm:overflow-visible shrink-0 items-center">
        {periods.map((period) => {
          const isSelected = selectedPeriod === period.value;
          return (
            <Button
              key={period.value}
              onClick={() =>
                onPeriodChange(period.value as "30" | "90" | "365")
              }
              variant="outline"
              size="sm"
              selected={isSelected}
              className="flex-1 sm:flex-none text-xs md:text-sm h-6 md:h-7 px-2 md:px-3 whitespace-nowrap"
            >
              {period.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
