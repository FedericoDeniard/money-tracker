import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import { adminService, type AdminUserDetail } from "../services/admin.service";

export function useAdminUserDetail(userId: string | undefined) {
  return useQuery<AdminUserDetail | null>({
    queryKey: queryKeys.admin.userDetail(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const rows = await adminService.getUser(userId);
      return rows?.[0] ?? null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
