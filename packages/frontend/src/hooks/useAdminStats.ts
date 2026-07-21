import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import { adminService, type AdminStats } from "../services/admin.service";

export function useAdminStats() {
  return useQuery<AdminStats | null>({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => adminService.getStats(),
    staleTime: 60_000,
  });
}
