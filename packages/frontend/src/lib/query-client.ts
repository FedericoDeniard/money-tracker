import { QueryClient } from '@tanstack/react-query';

// Convert times to milliseconds
const STALE_TIME = 5 * 60 * 1000; // 5 minutes for transaction data
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes cache time

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      gcTime: CACHE_TIME, // renamed from cacheTime in v5
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Mutations don't retry by default, but we can add custom logic if needed
      retry: false,
    },
  },
});

// Query key factories for consistent key structure
export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  },
  transactionFilters: {
    all: ['transaction-filters'] as const,
    currencies: () => [...queryKeys.transactionFilters.all, 'currencies'] as const,
    emails: () => [...queryKeys.transactionFilters.all, 'emails'] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    data: (filters: Record<string, unknown>) => [...queryKeys.metrics.all, 'data', filters] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    candidates: (params: Record<string, unknown>) =>
      [...queryKeys.subscriptions.all, 'candidates', params] as const,
  },
  gmail: {
    all: ['gmail'] as const,
    status: (userId?: string) => [...queryKeys.gmail.all, 'status', userId] as const,
    watches: (userId?: string) => [...queryKeys.gmail.all, 'watches', userId] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    tasks: (userId?: string) =>
      [...queryKeys.dashboard.all, 'tasks', userId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
  },
  notificationPreferences: {
    all: ['notification-preferences'] as const,
    list: () => [...queryKeys.notificationPreferences.all, 'list'] as const,
  },
  serverConfig: {
    all: ['server-config'] as const,
  },
} as const;