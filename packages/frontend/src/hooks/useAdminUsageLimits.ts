import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminUsageLimitRow,
} from "../services/admin.service";

export function useAdminUsageLimits() {
  return useQuery<AdminUsageLimitRow[]>({
    queryKey: queryKeys.admin.usageLimits(),
    queryFn: async () => {
      const result = await adminService.listUsageLimits();
      return result ?? [];
    },
    staleTime: 60_000,
  });
}
