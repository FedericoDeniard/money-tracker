import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminPaymentEventRow,
} from "../services/admin.service";

export interface UseAdminPaymentEventsParams {
  page: number;
  pageSize?: number;
}

export function useAdminPaymentEvents(params: UseAdminPaymentEventsParams) {
  const pageSize = params.pageSize ?? 25;
  return useQuery<AdminPaymentEventRow[]>({
    queryKey: queryKeys.admin.paymentEvents(pageSize),
    queryFn: async () => {
      const result = await adminService.listPaymentEvents(
        pageSize,
        params.page * pageSize
      );
      return result ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAdminPaymentEventsCount() {
  return useQuery<number>({
    queryKey: [...queryKeys.admin.paymentEvents(0), "count"],
    queryFn: async () => {
      const result = await adminService.countPaymentEvents();
      return result ?? 0;
    },
    staleTime: 30_000,
  });
}
