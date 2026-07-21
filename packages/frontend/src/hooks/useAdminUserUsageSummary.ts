import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminUserUsageSummaryRow,
} from "../services/admin.service";

export function useAdminUserUsageSummary(userId: string | undefined) {
  return useQuery<AdminUserUsageSummaryRow[]>({
    queryKey: queryKeys.admin.userUsageSummary(userId ?? ""),
    queryFn: async () => {
      if (!userId) return [];
      const result = await adminService.getUserUsageSummary(userId);
      return result ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
