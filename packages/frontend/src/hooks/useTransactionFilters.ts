import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createTransactionsService } from "../services/transactions.service";
import { queryKeys } from "../lib/query-client";

export function useTransactionFilters() {
  const { data: currencies, refetch: refetchCurrencies } = useSuspenseQuery({
    queryKey: queryKeys.transactionFilters.currencies(),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.getAvailableCurrencies();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: emails, refetch: refetchEmails } = useSuspenseQuery({
    queryKey: queryKeys.transactionFilters.emails(),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.getAvailableEmails();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    currencies,
    emails,
    refetch: () => {
      void refetchCurrencies();
      void refetchEmails();
    },
  };
}
