import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export interface CurrencyComparisonProps {
  transactions: Transaction[];
  selectedPeriod: string;
  getCurrencySymbol: (currency: string) => string;
}

interface Transaction {
  transaction_type: string;
  amount: number;
  currency: string;
  category?: string;
}

export function CurrencyComparison({
  transactions,
  getCurrencySymbol,
}: CurrencyComparisonProps) {
  const { t } = useTranslation();

  // Calculate metrics for each currency
  const currencyMetrics = useMemo(() => {
    if (!transactions.length) return [];

    const currencyMap = new Map<
      string,
      {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        transactionCount: number;
        topCategory: { name: string; amount: number } | null;
        categories: Map<string, number>;
        savingsRate: number;
        avgTransactionSize: number;
      }
    >();

    transactions.forEach((tx) => {
      const currency = tx.currency;
      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, {
          totalIncome: 0,
          totalExpense: 0,
          netBalance: 0,
          transactionCount: 0,
          topCategory: null,
          categories: new Map(),
          savingsRate: 0,
          avgTransactionSize: 0,
        });
      }

      const metrics = currencyMap.get(currency)!;
      metrics.transactionCount++;

      if (tx.transaction_type === "income") {
        metrics.totalIncome += tx.amount;
      } else {
        metrics.totalExpense += tx.amount;
        // Track category expenses
        const category = tx.category || "other";
        metrics.categories.set(
          category,
          (metrics.categories.get(category) || 0) + tx.amount,
        );

        // Update top category
        if (!metrics.topCategory || tx.amount > metrics.topCategory.amount) {
          metrics.topCategory = { name: category, amount: tx.amount };
        }
      }
    });

    // Calculate derived metrics for each currency
    currencyMap.forEach((metrics) => {
      metrics.netBalance = metrics.totalIncome - metrics.totalExpense;
      metrics.savingsRate =
        metrics.totalIncome > 0
          ? ((metrics.totalIncome - metrics.totalExpense) /
              metrics.totalIncome) *
            100
          : 0;
      metrics.avgTransactionSize =
        metrics.transactionCount > 0
          ? (metrics.totalIncome + metrics.totalExpense) /
            metrics.transactionCount
          : 0;
    });

    return Array.from(currencyMap.entries()).map(([currency, metrics]) => ({
      currency,
      ...metrics,
      topCategories: Array.from(metrics.categories.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount })),
    }));
  }, [transactions]);

  if (!currencyMetrics.length) {
    return (
      <div className="text-center text-[var(--text-secondary)] py-8">
        <p>{t("metrics.noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {currencyMetrics.map((metrics) => (
          <div
            key={metrics.currency}
            className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-transparent hover:border-[var(--border)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {metrics.currency}
              </h3>
              <span className="text-xs font-medium bg-[var(--bg-primary)] text-[var(--text-secondary)] px-2 py-1 rounded-full border border-[var(--border)]">
                {metrics.transactionCount} {t("metrics.transactions")}
              </span>
            </div>

            <div className="space-y-4">
              {/* Income */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-[var(--text-secondary)]">
                  <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mr-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  {t("metrics.totalIncome")}
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  {getCurrencySymbol(metrics.currency)}
                  {metrics.totalIncome.toFixed(2)}
                </span>
              </div>

              {/* Expense */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-[var(--text-secondary)]">
                  <div className="p-1 rounded-full bg-rose-50 dark:bg-rose-900/20 mr-2">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  {t("metrics.totalExpense")}
                </div>
                <span className="text-sm font-semibold text-rose-600">
                  {getCurrencySymbol(metrics.currency)}
                  {metrics.totalExpense.toFixed(2)}
                </span>
              </div>

              {/* Savings Rate */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)] ml-7">
                  {t("metrics.savingsRate")}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    metrics.savingsRate >= 20
                      ? "text-emerald-600"
                      : metrics.savingsRate >= 10
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {metrics.savingsRate.toFixed(1)}%
                </span>
              </div>

              {/* Net Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/50">
                <div className="flex items-center text-sm text-[var(--text-secondary)]">
                  <div className="p-1 rounded-full bg-blue-50 dark:bg-blue-900/20 mr-2">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  {t("metrics.netBalance")}
                </div>
                <span
                  className={`text-sm font-bold ${
                    metrics.netBalance >= 0 ? "text-blue-600" : "text-rose-600"
                  }`}
                >
                  {getCurrencySymbol(metrics.currency)}
                  {metrics.netBalance.toFixed(2)}
                </span>
              </div>

              {/* Average Transaction Size */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  {t("metrics.avgTransactionSize")}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {getCurrencySymbol(metrics.currency)}
                  {metrics.avgTransactionSize.toFixed(2)}
                </span>
              </div>

              {/* Top Category */}
              {metrics.topCategory && (
                <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
                  {t("metrics.topCategory")}:{" "}
                  {t(`categories.${metrics.topCategory.name}`)}(
                  {getCurrencySymbol(metrics.currency)}
                  {metrics.topCategory.amount.toFixed(2)})
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Insights */}
      <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
          {t("metrics.currencyInsights")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {currencyMetrics.length}
            </p>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
              {t("metrics.activeCurrencies")}
            </p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {currencyMetrics.reduce((sum, m) => sum + m.transactionCount, 0)}
            </p>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
              {t("metrics.totalTransactions")}
            </p>
          </div>
          <div className="text-center p-4 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {currencyMetrics.find((m) => m.netBalance > 0)?.currency || "-"}
            </p>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
              {t("metrics.mostProfitableCurrency")}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown by Currency */}
      <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
          {t("metrics.categoryBreakdownByCurrency")}
        </h3>
        <div className="space-y-4">
          {currencyMetrics.map((metrics) => (
            <div
              key={metrics.currency}
              className="bg-[var(--bg-primary)] p-5 rounded-xl border border-transparent hover:border-[var(--border)] transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[var(--text-primary)] text-lg">
                  {metrics.currency}
                </span>
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-lg">
                  {t("metrics.topCategories")}
                </span>
              </div>
              {metrics.topCategories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {metrics.topCategories.map((category, idx) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-[var(--bg-secondary)]/50"
                    >
                      <span className="text-[var(--text-secondary)] truncate mr-2">
                        <span className="opacity-50 mr-2">0{idx + 1}</span>
                        {t(`categories.${category.name}`)}
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {getCurrencySymbol(metrics.currency)}
                        {category.amount.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] italic">
                  {t("metrics.noExpenses")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Insights */}
      <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
          {t("metrics.behavioralInsights")}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Best Saver */}
          <div className="p-5 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t("metrics.bestSaver")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-600">
                {
                  currencyMetrics.reduce((best, current) =>
                    current.savingsRate > best.savingsRate ? current : best,
                  ).currency
                }
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {currencyMetrics
                  .reduce((best, current) =>
                    current.savingsRate > best.savingsRate ? current : best,
                  )
                  .savingsRate.toFixed(1)}
                % {t("metrics.savingsRate")}
              </p>
            </div>
          </div>

          {/* Highest Spender */}
          <div className="p-5 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t("metrics.highestSpender")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-rose-600">
                {
                  currencyMetrics.reduce((highest, current) =>
                    current.totalExpense > highest.totalExpense
                      ? current
                      : highest,
                  ).currency
                }
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {getCurrencySymbol(
                  currencyMetrics.reduce((highest, current) =>
                    current.totalExpense > highest.totalExpense
                      ? current
                      : highest,
                  ).currency,
                )}
                {currencyMetrics
                  .reduce((highest, current) =>
                    current.totalExpense > highest.totalExpense
                      ? current
                      : highest,
                  )
                  .totalExpense.toFixed(0)}{" "}
                {t("metrics.totalExpense")}
              </p>
            </div>
          </div>

          {/* Most Active */}
          <div className="p-5 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t("metrics.mostActive")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-blue-600">
                {
                  currencyMetrics.reduce((most, current) =>
                    current.transactionCount > most.transactionCount
                      ? current
                      : most,
                  ).currency
                }
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {
                  currencyMetrics.reduce((most, current) =>
                    current.transactionCount > most.transactionCount
                      ? current
                      : most,
                  ).transactionCount
                }{" "}
                {t("metrics.transactions")}
              </p>
            </div>
          </div>

          {/* Largest Transactions */}
          <div className="p-5 bg-[var(--bg-primary)] rounded-xl border border-transparent hover:border-[var(--border)] transition-all">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t("metrics.largestTransactions")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-purple-600">
                {
                  currencyMetrics.reduce((largest, current) =>
                    current.avgTransactionSize > largest.avgTransactionSize
                      ? current
                      : largest,
                  ).currency
                }
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {getCurrencySymbol(
                  currencyMetrics.reduce((largest, current) =>
                    current.avgTransactionSize > largest.avgTransactionSize
                      ? current
                      : largest,
                  ).currency,
                )}
                {currencyMetrics
                  .reduce((largest, current) =>
                    current.avgTransactionSize > largest.avgTransactionSize
                      ? current
                      : largest,
                  )
                  .avgTransactionSize.toFixed(0)}{" "}
                {t("metrics.avgTransaction")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
