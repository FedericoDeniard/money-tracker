import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createTransactionsService } from "../services/transactions.service";
import { queryKeys } from "../lib/query-client";

export function useTransactionFilters() {
  const currenciesQuery = useSuspenseQuery({
    queryKey: queryKeys.transactionFilters.currencies(),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return await service.getAvailableCurrencies();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const emailsQuery = useSuspenseQuery({
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
    currencies: currenciesQuery.data,
    emails: emailsQuery.data,
    refetch: () => {
      currenciesQuery.refetch();
      emailsQuery.refetch();
    },
  };
}
