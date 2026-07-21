import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import { adminService, type AdminSeedRow } from "../services/admin.service";

export interface UseAdminSeedsParams {
  status?: string;
  limit?: number;
}

export function useAdminSeeds(params: UseAdminSeedsParams = {}) {
  const limit = params.limit ?? 100;
  return useQuery<AdminSeedRow[]>({
    queryKey: queryKeys.admin.seeds({
      status: params.status,
      limit,
    }),
    queryFn: async () => {
      const result = await adminService.listSeeds({
        status: params.status,
        limit,
      });
      return result ?? [];
    },
    staleTime: 30_000,
  });
}
