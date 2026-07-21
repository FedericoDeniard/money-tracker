import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import { adminService, type AdminSeedRow } from "../services/admin.service";

export interface UseAdminSeedsParams {
  status?: string;
  page: number;
  pageSize?: number;
}

export function useAdminSeeds(params: UseAdminSeedsParams) {
  const pageSize = params.pageSize ?? 25;
  return useQuery<AdminSeedRow[]>({
    queryKey: queryKeys.admin.seeds({
      status: params.status,
      limit: pageSize,
    }),
    queryFn: async () => {
      const result = await adminService.listSeeds({
        status: params.status,
        limit: pageSize,
        offset: params.page * pageSize,
      });
      return result ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAdminSeedsCount(status?: string) {
  return useQuery<number>({
    queryKey: [...queryKeys.admin.seeds({ status, limit: 0 }), "count"],
    queryFn: async () => {
      const result = await adminService.countSeeds(status);
      return result ?? 0;
    },
    staleTime: 30_000,
  });
}
