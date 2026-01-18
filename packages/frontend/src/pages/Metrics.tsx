import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { createTransactionsService } from "../services/transactions.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { CategoryPieChart } from "../components/charts/CategoryPieChart";

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export function Metrics() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<"30" | "90" | "365">(
    "30",
  );

  const {
    data: transactions,
    loading,
    error,
  } = useSupabaseQuery(async (supabase) => {
    const service = createTransactionsService(supabase);
    return await service.getTransactions();
  }, []);

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    const daysAgo = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return transactions.filter((tx) => new Date(tx.created_at) >= cutoffDate);
  }, [transactions, selectedPeriod]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!filteredTransactions.length) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        transactionCount: 0,
        averageTransaction: 0,
        topCategory: null,
      };
    }

    const income = filteredTransactions
      .filter((tx) => tx.transaction_type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = filteredTransactions
      .filter((tx) => tx.transaction_type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const categoryTotals = filteredTransactions.reduce(
      (acc, tx) => {
        const category = tx.category || "other";
        acc[category] = (acc[category] || 0) + tx.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCategory = Object.entries(categoryTotals).sort(
      ([, a], [, b]) => b - a,
    )[0];

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      transactionCount: filteredTransactions.length,
      averageTransaction:
        filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
        filteredTransactions.length,
      topCategory: topCategory
        ? { name: topCategory[0], amount: topCategory[1] }
        : null,
    };
  }, [filteredTransactions]);

  // Calculate monthly data for charts
  const monthlyData = useMemo((): MonthlyData[] => {
    if (!filteredTransactions.length) return [];

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.created_at);
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
        expense: data.expense,
        net: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
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

  const metricCards: MetricCard[] = [
    {
      title: t("metrics.totalIncome"),
      value: `$${metrics.totalIncome.toFixed(2)}`,
      change: 12.5, // TODO: Calculate actual change
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-green-600 bg-green-50 border-green-200",
    },
    {
      title: t("metrics.totalExpense"),
      value: `$${metrics.totalExpense.toFixed(2)}`,
      change: -8.3, // TODO: Calculate actual change
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-red-600 bg-red-50 border-red-200",
    },
    {
      title: t("metrics.netBalance"),
      value: `$${metrics.netBalance.toFixed(2)}`,
      change: 15.2, // TODO: Calculate actual change
      icon: <DollarSign className="w-5 h-5" />,
      color:
        metrics.netBalance >= 0
          ? "text-blue-600 bg-blue-50 border-blue-200"
          : "text-red-600 bg-red-50 border-red-200",
    },
    {
      title: t("metrics.averageTransaction"),
      value: `$${metrics.averageTransaction.toFixed(2)}`,
      change: 2.1, // TODO: Calculate actual change
      icon: <CreditCard className="w-5 h-5" />,
      color: "text-purple-600 bg-purple-50 border-purple-200",
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t("metrics.title")}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {t("metrics.description")}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: "30", label: t("metrics.last30Days") },
            { value: "90", label: t("metrics.last90Days") },
            { value: "365", label: t("metrics.lastYear") },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() =>
                setSelectedPeriod(period.value as "30" | "90" | "365")
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period.value
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <div key={index} className={`p-4 rounded-lg border ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <div className="flex items-center mt-2 text-sm">
                  {card.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>{Math.abs(card.change)}%</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/20">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-[var(--bg-secondary)] p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t("metrics.monthlyTrend")}
          </h2>
          <MonthlyTrendChart data={monthlyData} />
        </div>

        {/* Category Breakdown */}
        <div className="bg-[var(--bg-secondary)] p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t("metrics.categoryBreakdown")}
          </h2>
          <CategoryPieChart data={categoryData} />
        </div>
      </div>

      {/* Top Insights */}
      <div className="bg-[var(--bg-secondary)] p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <PiggyBank className="w-5 h-5" />
          {t("metrics.insights")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              {t("metrics.topSpendingCategory")}
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {metrics.topCategory
                ? t(`categories.${metrics.topCategory.name}`)
                : t("metrics.noData")}
            </p>
            {metrics.topCategory && (
              <p className="text-sm text-[var(--text-secondary)]">
                ${metrics.topCategory.amount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              {t("metrics.totalTransactions")}
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {metrics.transactionCount}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("metrics.inLastPeriod", { days: selectedPeriod })}
            </p>
          </div>

          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              {t("metrics.savingsRate")}
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {metrics.totalIncome > 0
                ? `${(((metrics.totalIncome - metrics.totalExpense) / metrics.totalIncome) * 100).toFixed(1)}%`
                : "0%"}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("metrics.ofIncome")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
