import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { createTransactionsService } from '../services/transactions.service';
import { queryKeys } from '../lib/query-client';

export function useTransactionFilters() {
  const currenciesQuery = useQuery({
    queryKey: queryKeys.transactionFilters.currencies(),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.getAvailableCurrencies();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - filters change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  const emailsQuery = useQuery({
    queryKey: queryKeys.transactionFilters.emails(),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.getAvailableEmails();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - filters change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  return {
    currencies: currenciesQuery.data || [],
    emails: emailsQuery.data || [],
    isLoading: currenciesQuery.isLoading || emailsQuery.isLoading,
    error: currenciesQuery.error || emailsQuery.error,
    refetch: () => {
      currenciesQuery.refetch();
      emailsQuery.refetch();
    },
  };
}