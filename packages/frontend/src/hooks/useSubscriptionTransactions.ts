import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-client';
import { createTransactionsService } from '../services/transactions.service';

export function useSubscriptionTransactions(merchantNormalized: string, currency: string, enabled: boolean = true) {
    return useQuery({
        queryKey: [...queryKeys.transactions.all, 'subscription', merchantNormalized, currency],
        queryFn: async () => {
            const supabase = await getSupabase();
            const service = createTransactionsService(supabase);
            return service.getSubscriptionTransactions(merchantNormalized, currency);
        },
        enabled: enabled && !!merchantNormalized && !!currency,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}
