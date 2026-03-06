import { useSuspenseQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-client';
import { createTransactionsService } from '../services/transactions.service';

interface UseSubscriptionCandidatesOptions {
  minConfidence?: number;
  minOccurrences?: number;
}

export function useSubscriptionCandidates(options?: UseSubscriptionCandidatesOptions) {
  const minConfidence = options?.minConfidence ?? 50;
  const minOccurrences = options?.minOccurrences ?? 2;

  return useSuspenseQuery({
    queryKey: queryKeys.subscriptions.candidates({
      minConfidence,
      minOccurrences,
    }),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      return service.getSubscriptionCandidates({ minConfidence, minOccurrences });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
