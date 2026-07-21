import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminPaymentEventRow,
} from "../services/admin.service";

export function useAdminPaymentEvents(limit: number = 50) {
  return useQuery<AdminPaymentEventRow[]>({
    queryKey: queryKeys.admin.paymentEvents(limit),
    queryFn: async () => {
      const result = await adminService.listPaymentEvents(limit);
      return result ?? [];
    },
    staleTime: 30_000,
  });
}
