import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import { adminService, type AdminUserRow } from "../services/admin.service";

export interface UseAdminUsersParams {
  search?: string;
  page: number;
  pageSize?: number;
}

export function useAdminUsers(params: UseAdminUsersParams) {
  const pageSize = params.pageSize ?? 25;
  return useQuery<AdminUserRow[]>({
    queryKey: queryKeys.admin.users({
      search: params.search,
      limit: pageSize,
      offset: params.page * pageSize,
    }),
    queryFn: async () => {
      const result = await adminService.listUsers({
        search: params.search,
        limit: pageSize,
        offset: params.page * pageSize,
      });
      return result ?? [];
    },
    staleTime: 30_000,
  });
}
