import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { gmailService, type GmailStatus } from '../services/gmail.service';
import { queryKeys } from '../lib/query-client';

export function useGmailStatus(userId?: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.gmail.status(userId),
    queryFn: async () => {
      if (!userId) {
        return {
          connections: [],
          total: 0,
          activeTotal: 0,
          connectedTotal: 0,
          needsReconnectTotal: 0,
          disconnectedTotal: 0,
        } as GmailStatus;
      }
      return await gmailService.getConnectionStatus(userId);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGmailWatches(userId?: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.gmail.watches(userId),
    queryFn: async () => {
      if (!userId) return [];
      return await gmailService.getWatches(userId);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Hook to invalidate Gmail-related queries
export function useInvalidateGmailQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gmail.all });
  };
}