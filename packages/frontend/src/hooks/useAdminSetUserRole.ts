import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService, type AppRole } from "../services/admin.service";
import { queryKeys } from "../lib/query-client";

export interface SetUserRoleInput {
  userId: string;
  role: AppRole;
}

export function useAdminSetUserRole() {
  const qc = useQueryClient();
  return useMutation<null, Error, SetUserRoleInput>({
    mutationFn: async ({ userId, role }) => {
      const result = await adminService.setUserRole(userId, role);
      if (result === null) {
        throw new Error("Failed to update role");
      }
      return result;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      qc.invalidateQueries({
        queryKey: queryKeys.admin.userDetail(userId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.admin.users({
          search: undefined,
          limit: 25,
          offset: 0,
        }),
      });
    },
  });
}
