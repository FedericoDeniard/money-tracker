import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-client";
import { createNotificationsService } from "../services/notifications.service";

async function getService() {
  const supabase = await getSupabase();
  return createNotificationsService(supabase);
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notificationPreferences.list(),
    queryFn: async () => {
      const service = await getService();
      return service.listTypePreferences();
    },
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      notification_type_id: string;
      is_enabled?: boolean;
      is_muted?: boolean;
      muted_until?: string | null;
    }) => {
      const service = await getService();
      await service.upsertTypePreference(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
