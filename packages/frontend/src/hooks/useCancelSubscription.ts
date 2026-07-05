import { useMutation } from "@tanstack/react-query";
import { paymentsService } from "../services/payments.service";

export function useCancelSubscription() {
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => paymentsService.cancelMySubscription(),
  });
}
