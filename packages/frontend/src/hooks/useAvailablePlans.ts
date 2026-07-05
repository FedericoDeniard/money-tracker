import { useQuery } from "@tanstack/react-query";
import {
  paymentsService,
  type PlanWithVariants,
} from "../services/payments.service";
import { queryKeys } from "../lib/query-client";

export function useAvailablePlans() {
  return useQuery<PlanWithVariants[]>({
    queryKey: queryKeys.payments.plans(),
    queryFn: () => paymentsService.getAvailablePlans(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
