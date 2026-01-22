import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMetricsData } from "../hooks/useMetricsData";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { CategoryPieChart } from "../components/charts/CategoryPieChart";
import {
  MetricCard,
  FilterBar,
  InsightsSection,
  CurrencyComparison,
  type MetricCardProps,
} from "../components/metrics";
import { getCurrencySymbol } from "../utils/currency";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export function Metrics() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<"30" | "90" | "365">(
    "30",
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all");

  const {
    availableCurrencies,
    metrics,
    isLoading: loading,
    error,
    filteredTransactions,
  } = useMetricsData({
    selectedPeriod,
    selectedCurrency,
  });

  // Calculate monthly data for charts
  const monthlyData = useMemo((): MonthlyData[] => {
    if (!filteredTransactions.length) return [];

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expense: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      if (tx.transaction_type === "income") {
        monthData.income += tx.amount;
      } else {
        monthData.expense += tx.amount;
      }
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: -data.expense, // Show expenses as negative values
        net: data.income - data.expense,
      }))
      .sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
      );
  }, [filteredTransactions]);

  // Calculate category breakdown
  const categoryData = useMemo((): CategoryData[] => {
    if (!filteredTransactions.length) return [];

    const total = metrics.totalExpense;
    const categoryMap = new Map<string, { amount: number; count: number }>();

    filteredTransactions
      .filter((tx) => tx.transaction_type === "expense")
      .forEach((tx) => {
        const category = tx.category || "other";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { amount: 0, count: 0 });
        }
        const data = categoryMap.get(category)!;
        data.amount += tx.amount;
        data.count += 1;
      });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, metrics.totalExpense]);

  // Get display currency for metrics
  const displayCurrency =
    selectedCurrency === "all"
      ? filteredTransactions[0]?.currency || "USD"
      : selectedCurrency;

  const metricCards: MetricCardProps[] = [
    {
      title: t("metrics.totalIncome"),
      value: `${getCurrencySymbol(displayCurrency)}${metrics.totalIncome.toFixed(2)}`,
      change: metrics.changes.income,
      icon: <TrendingUp className="w-5 h-5" />,
      currency: selectedCurrency === "all" ? displayCurrency : selectedCurrency,
    },
    {
      title: t("metrics.totalExpense"),
      value: `${getCurrencySymbol(displayCurrency)}${metrics.totalExpense.toFixed(2)}`,
      change: metrics.changes.expense,
      icon: <TrendingDown className="w-5 h-5" />,
      currency: selectedCurrency === "all" ? displayCurrency : selectedCurrency,
    },
    {
      title: t("metrics.netBalance"),
      value: `${getCurrencySymbol(displayCurrency)}${metrics.netBalance.toFixed(2)}`,
      change: metrics.changes.netBalance,
      icon: <DollarSign className="w-5 h-5" />,
      currency: selectedCurrency === "all" ? displayCurrency : selectedCurrency,
    },
    {
      title: t("metrics.averageTransaction"),
      value: `${getCurrencySymbol(displayCurrency)}${metrics.averageTransaction.toFixed(2)}`,
      change: metrics.changes.averageTransaction,
      icon: <CreditCard className="w-5 h-5" />,
      currency: selectedCurrency === "all" ? displayCurrency : selectedCurrency,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--error)] mb-2">{t("errors.loadingError")}</p>
          <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)]">
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Check if multiple currencies are detected
  if (selectedCurrency === "all" && availableCurrencies.length > 1) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("metrics.title")}
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              {t("metrics.description")}
            </p>
          </div>

          {/* Filters */}
          <FilterBar
            selectedPeriod={selectedPeriod}
            selectedCurrency={selectedCurrency}
            availableCurrencies={availableCurrencies}
            onPeriodChange={setSelectedPeriod}
            onCurrencyChange={setSelectedCurrency}
          />
        </div>

        {/* Currency Comparison */}
        <div>
          <CurrencyComparison
            transactions={filteredTransactions}
            selectedPeriod={selectedPeriod}
            getCurrencySymbol={getCurrencySymbol}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t("metrics.title")}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {t("metrics.description")}
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          selectedPeriod={selectedPeriod}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onPeriodChange={setSelectedPeriod}
          onCurrencyChange={setSelectedCurrency}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <MetricCard
            key={index}
            title={card.title}
            value={card.value}
            change={card.change}
            icon={card.icon}
            currency={card.currency}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
            {t("metrics.monthlyTrend")}
          </h2>
          <MonthlyTrendChart data={monthlyData} />
        </div>

        {/* Category Breakdown */}
        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
            {t("metrics.categoryBreakdown")}
          </h2>
          <CategoryPieChart data={categoryData} />
        </div>
      </div>

      {/* Top Insights */}
      <InsightsSection
        data={{
          topCategory: metrics.topCategory,
          transactionCount: metrics.transactionCount,
          totalIncome: metrics.totalIncome,
          totalExpense: metrics.totalExpense,
        }}
        selectedPeriod={selectedPeriod}
        getCurrencySymbol={getCurrencySymbol}
        displayCurrency={displayCurrency}
      />
    </div>
  );
}
