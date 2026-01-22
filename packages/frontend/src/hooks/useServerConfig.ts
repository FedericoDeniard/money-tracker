import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';

interface ServerConfig {
  supabase: { url: string; anonKey: string };
  backendUrl: string;
}

async function fetchServerConfig(): Promise<ServerConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("Failed to fetch configuration from server");
  }

  const config = await response.json();

  if (!config?.supabase?.url || !config?.supabase?.anonKey) {
    throw new Error("Invalid configuration received from server");
  }

  if (!config?.backendUrl) {
    throw new Error("Invalid configuration: missing backendUrl");
  }

  return config;
}

export function useServerConfig() {
  return useQuery({
    queryKey: queryKeys.serverConfig.all,
    queryFn: fetchServerConfig,
    staleTime: 60 * 60 * 1000, // 1 hour - server config rarely changes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours cache - keep config cached for long time
    retry: (failureCount, error) => {
      // Don't retry on 5xx errors (server errors) after 2 attempts
      if (error instanceof Error && 'status' in error) {
        const status = (error as { status?: number }).status;
        if (status && status >= 500) {
          return failureCount < 2;
        }
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
  });
}