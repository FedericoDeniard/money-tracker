import {
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import {
  createTransactionsService,
  type Transaction,
  type TransactionFilters,
  type TransactionPage,
} from "../services/transactions.service";
import { queryKeys } from "../lib/query-client";

const PAGE_SIZE = 10;

interface UseTransactionsOptions {
  filters?: TransactionFilters;
  enabled?: boolean;
}

export function useTransactions({ filters = {} }: UseTransactionsOptions = {}) {
  return useSuspenseInfiniteQuery({
    queryKey: queryKeys.transactions.list(
      filters as unknown as Record<string, unknown>
    ),
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);

      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const result: TransactionPage = await service.getTransactionsPaginated(
        filters,
        { from, to }
      );

      return {
        transactions: result.transactions,
        hasMore: result.hasMore,
        total: result.total,
        nextCursor: result.hasMore ? (pageParam as number) + 1 : undefined,
      };
    },
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for getting all transactions (for metrics and other use cases)
export function useAllTransactions({
  filters = {},
  enabled = true,
}: UseTransactionsOptions = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.transactions.lists(), "all", filters],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);

      // For "all" queries, we want to fetch all data in larger chunks
      const PAGE_SIZE_ALL = 100;
      const from = pageParam * PAGE_SIZE_ALL;
      const to = from + PAGE_SIZE_ALL - 1;

      const result: TransactionPage = await service.getTransactionsPaginated(
        filters,
        { from, to }
      );

      return {
        transactions: result.transactions,
        hasMore: result.hasMore,
        total: result.total,
        nextCursor: result.hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: 0,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Utility function to flatten infinite query data
export function flattenTransactionsData(
  data: ReturnType<typeof useTransactions>["data"] | undefined
) {
  if (!data) return [];
  const seen = new Set<string>();
  const result: Transaction[] = [];
  for (const page of data.pages) {
    for (const transaction of page.transactions) {
      if (seen.has(transaction.id)) continue;
      seen.add(transaction.id);
      result.push(transaction);
    }
  }
  return result;
}

// Utility function to get total count from infinite query
export function getTotalCount(
  data: ReturnType<typeof useTransactions>["data"]
) {
  if (!data || data.pages.length === 0) return 0;
  return data.pages[0]?.total ?? 0;
}

// Utility function to check if there's more data
export function hasMorePages(data: ReturnType<typeof useTransactions>["data"]) {
  if (!data || data.pages.length === 0) return false;
  return data.pages[data.pages.length - 1]?.hasMore ?? false;
}
