import { useQuery } from "@tanstack/react-query";
import { getConfig, type AppConfig } from "../config";
import { queryKeys } from "../lib/query-client";

export function useConfig() {
  return useQuery<AppConfig>({
    queryKey: queryKeys.serverConfig.all,
    queryFn: getConfig,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
