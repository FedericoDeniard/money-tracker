import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { createTransactionsService, type Transaction, type TransactionsService } from '../services/transactions.service';
import { queryKeys } from '../lib/query-client';
import type { TransactionPage } from '../services/transactions.service';

type CreateTransactionInput = Parameters<TransactionsService['createTransaction']>[0];

interface UseTransactionMutationsReturn {
  createTransaction: (newTransaction: CreateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<string>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ id: string; updates: Partial<Transaction> }>;
  isCreating: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  createError: Error | null;
  deleteError: Error | null;
  updateError: Error | null;
}

export function useTransactionMutations(): UseTransactionMutationsReturn {
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
      // Dashboard action-first cards depend on transaction aggregates
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
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
      // Dashboard action-first cards depend on transaction aggregates
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTransaction: CreateTransactionInput) => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.createTransaction(newTransaction);
    },
    onMutate: async (newTransaction) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });
      
      const previousTransactions = queryClient.getQueryData(queryKeys.transactions.lists());
      
      // Optimistically add to cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.transactions.lists() },
        (oldData: InfiniteData<TransactionPage> | undefined) => {
          if (!oldData) return oldData;
          
          const newId = `optimistic-${Date.now()}`;
          const optimisticTransaction: Transaction = {
            ...newTransaction,
            id: newId,
            user_id: 'optimistic-user',
            recipient_email: '',
            created_at: new Date().toISOString(),
            amount: newTransaction.amount,
            category: newTransaction.category,
            currency: newTransaction.currency,
            date: newTransaction.date,
            merchant: newTransaction.merchant,
            source_email: newTransaction.source_email,
            source_message_id: newTransaction.source_message_id,
            transaction_date: newTransaction.transaction_date,
            transaction_description: newTransaction.transaction_description,
            transaction_type: newTransaction.transaction_type,
            updated_at: null,
            user_oauth_token_id: newTransaction.user_oauth_token_id ?? null
          };
          
          return {
            ...oldData,
            pages: oldData.pages.map((page: TransactionPage, i) => 
              i === 0 
                ? {
                    ...page,
                    transactions: [optimisticTransaction, ...page.transactions],
                    total: page.total ? page.total + 1 : page.total,
                  }
                : page
            ),
          };
        }
      );
      
      return { previousTransactions };
    },
    onError: (err, newTransaction, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions.lists(), context.previousTransactions);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  return {
    createTransaction: createMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    updateTransaction: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
    createError: createMutation.error,
    deleteError: deleteMutation.error,
    updateError: updateMutation.error,
  };
}