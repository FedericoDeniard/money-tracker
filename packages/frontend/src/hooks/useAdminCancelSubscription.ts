import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin.service";
import { queryKeys } from "../lib/query-client";

export interface CancelSubscriptionInput {
  userId: string;
  targetStatus?: "cancelled" | "paused" | "pending_cancellation";
}

export function useAdminCancelSubscription() {
  const qc = useQueryClient();
  return useMutation<string, Error, CancelSubscriptionInput>({
    mutationFn: async ({ userId, targetStatus }) => {
      const id = await adminService.cancelSubscription(userId, targetStatus);
      if (!id) {
        throw new Error("Failed to cancel subscription");
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
