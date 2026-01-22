import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { createTransactionsService, Transaction } from '../services/transactions.service';
import { queryKeys } from '../lib/query-client';

interface TransactionPage {
  transactions: Transaction[];
  hasMore: boolean;
  total?: number;
  nextCursor?: number;
}

export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      await service.deleteTransaction(transactionId);
      return transactionId;
    },
    onMutate: async (transactionId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      // Snapshot previous values for rollback
      const previousTransactions = queryClient.getQueryData(queryKeys.transactions.lists());

      // Optimistically remove from cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.transactions.lists() },
        (oldData: InfiniteData<TransactionPage> | undefined) => {
          if (!oldData) return oldData;

          // For infinite queries, we need to update each page
          return {
            ...oldData,
            pages: oldData.pages.map((page: TransactionPage) => ({
              ...page,
              transactions: page.transactions.filter((t: Transaction) => t.id !== transactionId),
              total: page.total ? page.total - 1 : page.total,
            })),
          };
        }
      );

      return { previousTransactions };
    },
    onError: (err, transactionId, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions.lists(), context.previousTransactions);
      }
    },
    onSuccess: () => {
      // Invalidate all transaction queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      // Also invalidate metrics since they depend on transaction data
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      await service.updateTransaction(id, updates);
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      // Snapshot previous values for rollback
      const previousTransactions = queryClient.getQueryData(queryKeys.transactions.lists());

      // Optimistically update in cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.transactions.lists() },
        (oldData: InfiniteData<TransactionPage> | undefined) => {
          if (!oldData) return oldData;

          // For infinite queries, we need to update each page
          return {
            ...oldData,
            pages: oldData.pages.map((page: TransactionPage) => ({
              ...page,
              transactions: page.transactions.map((t: Transaction) =>
                t.id === id ? { ...t, ...updates } : t
              ),
            })),
          };
        }
      );

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions.lists(), context.previousTransactions);
      }
    },
    onSuccess: () => {
      // Invalidate all transaction queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      // Also invalidate metrics since they depend on transaction data
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
    },
  });

  return {
    deleteTransaction: deleteMutation.mutate,
    updateTransaction: updateMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
    deleteError: deleteMutation.error,
    updateError: updateMutation.error,
  };
}