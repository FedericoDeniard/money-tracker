import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { config } from '../config';

interface ServerConfig {
  supabase: { url: string; anonKey: string };
  backendUrl: string;
}

async function fetchServerConfig(): Promise<ServerConfig> {
  // Return config directly - no fetch needed
  return config;
}

export function useServerConfig() {
  return useQuery({
    queryKey: queryKeys.serverConfig.all,
    queryFn: fetchServerConfig,
    staleTime: 60 * 60 * 1000, // 1 hour - config rarely changes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours cache - keep config cached for long time
    retry: false, // No need to retry - config is static
  });
}