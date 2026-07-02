import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  paymentsService,
  type CheckoutLinkResponse,
  type ProviderName,
} from "../services/payments.service";
import { queryKeys } from "../lib/query-client";

interface CreateCheckoutLinkInput {
  planId: string;
  provider: ProviderName;
}

export function useCreateCheckoutLink() {
  return useMutation<CheckoutLinkResponse, Error, CreateCheckoutLinkInput>({
    mutationFn: ({ planId, provider }) =>
      paymentsService.createCheckoutLink(planId, provider),
  });
}

export function useInvalidatePaymentsQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
  };
}
