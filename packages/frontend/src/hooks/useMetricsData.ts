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
  startDate?: string;
  endDate?: string;
  previousStartDate?: string;
  previousEndDate?: string;
  selectedCurrency: string;
  enabled?: boolean;
}

export function useMetricsData({
  startDate,
  endDate,
  previousStartDate,
  previousEndDate,
  selectedCurrency,
  enabled = true,
}: UseMetricsDataOptions) {
  const {
    data: currentData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllTransactions({
    filters: { startDate, endDate },
    enabled,
  });

  const {
    data: previousData,
    fetchNextPage: fetchPreviousNextPage,
    hasNextPage: hasPreviousNextPage,
    isFetchingNextPage: isFetchingPreviousNextPage,
  } = useAllTransactions({
    filters: { startDate: previousStartDate, endDate: previousEndDate },
    enabled: enabled && Boolean(previousStartDate && previousEndDate),
  });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (
      enabled &&
      previousStartDate &&
      previousEndDate &&
      hasPreviousNextPage &&
      !isFetchingPreviousNextPage
    ) {
      fetchPreviousNextPage();
    }
  }, [
    enabled,
    previousStartDate,
    previousEndDate,
    hasPreviousNextPage,
    isFetchingPreviousNextPage,
    fetchPreviousNextPage,
  ]);

  const currentTransactions = useMemo(
    () => flattenTransactionsData(currentData),
    [currentData]
  );

  const previousTransactions = useMemo(
    () => flattenTransactionsData(previousData),
    [previousData]
  );

  const { currencies: availableCurrencies } = useTransactionFilters();

  const filteredTransactions = useMemo(() => {
    if (selectedCurrency === "all") return currentTransactions;
    return currentTransactions.filter(tx => tx.currency === selectedCurrency);
  }, [currentTransactions, selectedCurrency]);

  const previousFilteredTransactions = useMemo(() => {
    if (selectedCurrency === "all") return previousTransactions;
    return previousTransactions.filter(tx => tx.currency === selectedCurrency);
  }, [previousTransactions, selectedCurrency]);

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

    const topCategory = Object.entries(categoryTotals).reduce(
      (max, entry) => (entry[1] > (max?.[1] ?? -Infinity) ? entry : max),
      null as [string, number] | null
    );

    const averageTransaction =
      filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
      filteredTransactions.length;

    let changes = {
      income: null as number | null,
      expense: null as number | null,
      netBalance: null as number | null,
      averageTransaction: null as number | null,
    };

    if (previousFilteredTransactions.length > 0) {
      const prevIncome = previousFilteredTransactions
        .filter((tx: Transaction) => tx.transaction_type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const prevExpense = previousFilteredTransactions
        .filter((tx: Transaction) => tx.transaction_type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const prevAverage =
        previousFilteredTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
        previousFilteredTransactions.length;

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
  }, [filteredTransactions, previousFilteredTransactions]);

  const isLoadingAllPages =
    isLoading ||
    isFetchingNextPage ||
    Boolean(hasNextPage) ||
    (Boolean(previousStartDate && previousEndDate) &&
      (isFetchingPreviousNextPage || Boolean(hasPreviousNextPage)));

  return {
    transactions: currentTransactions,
    filteredTransactions,
    availableCurrencies,
    metrics,
    isLoading,
    isLoadingAllPages,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}
