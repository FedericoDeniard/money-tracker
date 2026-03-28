import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";

export interface InsightsData {
  topCategory: { name: string; amount: number } | null;
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
}

export interface InsightsSectionProps {
  data: InsightsData;
  selectedPeriod: string;
  getCurrencySymbol: (currency: string) => string;
  displayCurrency: string;
}

export function InsightsSection({
  data,
  selectedPeriod,
  getCurrencySymbol,
  displayCurrency,
}: InsightsSectionProps) {
  const { t } = useTranslation();

  const savingsRate =
    data.totalIncome > 0
      ? (
          ((data.totalIncome - data.totalExpense) / data.totalIncome) *
          100
        ).toFixed(1)
      : "0";

  const insights = [
    {
      title: t("metrics.topSpendingCategory"),
      value: data.topCategory
        ? t(`categories.${data.topCategory.name}`)
        : t("metrics.noData"),
      subtitle: data.topCategory
        ? `${getCurrencySymbol(displayCurrency)}${data.topCategory.amount.toFixed(2)}`
        : "",
    },
    {
      title: t("metrics.totalTransactions"),
      value: data.transactionCount.toString(),
      subtitle: t("metrics.inLastPeriod", { days: selectedPeriod }),
    },
    {
      title: t("metrics.savingsRate"),
      value: `${savingsRate}%`,
      subtitle: t("metrics.ofIncome"),
    },
  ];

  return (
    <section className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)]">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <PiggyBank className="w-5 h-5" />
          </motion.div>
        </div>
        {t("metrics.insights")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map(insight => (
          <div
            key={insight.title}
            className="p-5 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--text-secondary)]/10 transition-colors duration-300 shadow-sm"
          >
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              {insight.title}
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {insight.value}
            </p>
            {insight.subtitle && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-80">
                {insight.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
