import { useMemo, useEffect } from "react";
import { useAllTransactions, flattenTransactionsData } from "./useTransactions";
import { useTransactionFilters } from "./useTransactionFilters";
import type { Transaction } from "../services/transactions.service";

interface MetricsData {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  averageTransaction: number;
  topCategory: { name: string; amount: number } | null;
  changes: {
    income: number | null;
    expense: number | null;
    netBalance: number | null;
    averageTransaction: number | null;
  };
}

interface UseMetricsDataOptions {
  selectedPeriod: "30" | "90" | "365";
  selectedCurrency: string;
  enabled?: boolean;
}

export function useMetricsData({
  selectedPeriod,
  selectedCurrency,
  enabled = true,
}: UseMetricsDataOptions) {
  // Get all transactions using our cached hook
  const {
    data: transactionsData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllTransactions({
    filters: {}, // Get all transactions for metrics calculations
    enabled,
  });

  // Auto-fetch all pages so metrics cover ALL transactions
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const allTransactions = useMemo(() => {
    return flattenTransactionsData(transactionsData);
  }, [transactionsData]);

  // Get available currencies from RPC (queries ALL transactions, not just loaded pages)
  const { currencies: availableCurrencies } = useTransactionFilters();

  // Filter transactions based on selected period and currency
  const filteredTransactions = useMemo(() => {
    if (!allTransactions.length) return [];

    const now = new Date();
    const daysAgo = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return allTransactions.filter((tx: Transaction) => {
      const dateMatch = new Date(tx.transaction_date) >= cutoffDate;
      const currencyMatch =
        selectedCurrency === "all" || tx.currency === selectedCurrency;
      return dateMatch && currencyMatch;
    });
  }, [allTransactions, selectedPeriod, selectedCurrency]);

  // Calculate metrics for current and previous period
  const metrics = useMemo((): MetricsData => {
    if (!filteredTransactions.length) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        transactionCount: 0,
        averageTransaction: 0,
        topCategory: null,
        changes: {
          income: null,
          expense: null,
          netBalance: null,
          averageTransaction: null,
        },
      };
    }

    const income = filteredTransactions
      .filter((tx: Transaction) => tx.transaction_type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = filteredTransactions
      .filter((tx: Transaction) => tx.transaction_type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const categoryTotals = filteredTransactions.reduce(
      (acc, tx) => {
        const category = tx.category || "other";
        acc[category] = (acc[category] || 0) + tx.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const topCategory = Object.entries(categoryTotals).sort(
      ([, a], [, b]) => b - a
    )[0];

    const averageTransaction =
      filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
      filteredTransactions.length;

    // Calculate previous period metrics for comparison
    const now = new Date();
    const daysAgo = parseInt(selectedPeriod);
    const currentPeriodStart = new Date(
      now.getTime() - daysAgo * 24 * 60 * 60 * 1000
    );
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - daysAgo * 24 * 60 * 60 * 1000
    );

    const previousPeriodTransactions =
      allTransactions?.filter((tx: Transaction) => {
        const txDate = new Date(tx.transaction_date);
        const currencyMatch =
          selectedCurrency === "all" || tx.currency === selectedCurrency;
        return (
          txDate >= previousPeriodStart &&
          txDate < currentPeriodStart &&
          currencyMatch
        );
      }) || [];

    let changes = {
      income: null as number | null,
      expense: null as number | null,
      netBalance: null as number | null,
      averageTransaction: null as number | null,
    };

    if (previousPeriodTransactions.length > 0) {
      const prevIncome = previousPeriodTransactions
        .filter((tx: Transaction) => tx.transaction_type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const prevExpense = previousPeriodTransactions
        .filter((tx: Transaction) => tx.transaction_type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const prevAverage =
        previousPeriodTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
        previousPeriodTransactions.length;

      changes = {
        income:
          prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null,
        expense:
          prevExpense > 0
            ? ((expense - prevExpense) / prevExpense) * 100
            : null,
        netBalance:
          prevIncome - prevExpense !== 0
            ? ((income - expense - (prevIncome - prevExpense)) /
                Math.abs(prevIncome - prevExpense)) *
              100
            : null,
        averageTransaction:
          prevAverage > 0
            ? ((averageTransaction - prevAverage) / prevAverage) * 100
            : null,
      };
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      transactionCount: filteredTransactions.length,
      averageTransaction,
      topCategory: topCategory
        ? { name: topCategory[0], amount: topCategory[1] }
        : null,
      changes,
    };
  }, [filteredTransactions, selectedPeriod, selectedCurrency, allTransactions]);

  return {
    transactions: allTransactions,
    filteredTransactions,
    availableCurrencies,
    metrics,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}
