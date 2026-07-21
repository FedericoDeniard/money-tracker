import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-client";
import {
  adminService,
  type AdminTopConsumerRow,
  type Capability,
} from "../services/admin.service";

export interface UseAdminTopConsumersParams {
  capability: Capability;
  periodStart: string;
  limit?: number;
}

export function useAdminTopConsumers(params: UseAdminTopConsumersParams) {
  const limit = params.limit ?? 20;
  return useQuery<AdminTopConsumerRow[]>({
    queryKey: queryKeys.admin.usageTopConsumers({
      capability: params.capability,
      periodStart: params.periodStart,
      limit,
    }),
    queryFn: async () => {
      const result = await adminService.getUsageTopConsumers({
        capability: params.capability,
        periodStart: params.periodStart,
        limit,
      });
      return result ?? [];
    },
    staleTime: 60_000,
  });
}
