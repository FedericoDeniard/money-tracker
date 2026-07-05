import { useQuery } from "@tanstack/react-query";
import {
  paymentsService,
  type MySubscription,
} from "../services/payments.service";
import { queryKeys } from "../lib/query-client";

export function useMySubscription(userId?: string) {
  return useQuery<MySubscription | null>({
    queryKey: queryKeys.payments.mySubscription(userId),
    queryFn: async () => {
      if (!userId) return null;
      return await paymentsService.getMySubscription(userId);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
