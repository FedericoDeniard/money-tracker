import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/admin.service";
import { queryKeys } from "../lib/query-client";
import { seedService } from "../services/seed.service";

export interface RetrySeedInput {
  seedId: string;
  connectionId: string;
}

export function useAdminRetrySeed() {
  const qc = useQueryClient();
  return useMutation<
    { seedId: string | undefined; status: string },
    Error,
    RetrySeedInput
  >({
    mutationFn: async ({ seedId, connectionId }) => {
      const reset = await adminService.retrySeed(seedId);
      if (!reset || reset.length === 0) {
        throw new Error("Failed to reset seed row");
      }
      const response = await seedService.startSeed(connectionId);
      return {
        seedId: response.seedId ?? reset[0]?.seed_id,
        status: response.status,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
