import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gmailService, type GmailStatus } from '../services/gmail.service';
import { queryKeys } from '../lib/query-client';

export function useGmailStatus(userId?: string) {
  return useQuery({
    queryKey: queryKeys.gmail.status(userId),
    queryFn: async () => {
      if (!userId) {
        return { connections: [], total: 0 } as GmailStatus;
      }
      return await gmailService.getConnectionStatus(userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - Gmail status changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

export function useGmailWatches(userId?: string) {
  return useQuery({
    queryKey: queryKeys.gmail.watches(userId),
    queryFn: async () => {
      if (!userId) return [];
      return await gmailService.getWatches(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - watches are more static
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });
}

// Hook to invalidate Gmail-related queries
export function useInvalidateGmailQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gmail.all });
  };
}