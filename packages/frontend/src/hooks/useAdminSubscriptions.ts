import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminSubscriptionRow,
} from "../services/admin.service";

export interface UseAdminSubscriptionsParams {
  status?: string;
  page: number;
  pageSize?: number;
}

export function useAdminSubscriptions(params: UseAdminSubscriptionsParams) {
  const pageSize = params.pageSize ?? 25;
  return useQuery<AdminSubscriptionRow[]>({
    queryKey: queryKeys.admin.subscriptions({
      status: params.status,
      limit: pageSize,
      offset: params.page * pageSize,
    }),
    queryFn: async () => {
      const result = await adminService.listSubscriptions({
        status: params.status,
        limit: pageSize,
        offset: params.page * pageSize,
      });
      return result ?? [];
    },
    staleTime: 30_000,
  });
}
