import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-client";
import { createChatThreadsService } from "../services/chat-threads.service";

async function getService() {
  const supabase = await getSupabase();
  return createChatThreadsService(supabase);
}

export function useChatThreads() {
  return useQuery({
    queryKey: queryKeys.chatThreads.all,
    queryFn: async () => {
      const service = await getService();
      return service.listThreads();
    },
    staleTime: 30 * 1000,
  });
}

export function useThreadMessages(threadId: string | null) {
  return useQuery({
    queryKey: threadId
      ? queryKeys.chatThreads.messages(threadId)
      : ["chat-threads", "messages", "disabled"],
    queryFn: async () => {
      if (!threadId) return [];
      const service = await getService();
      return service.listMessages(threadId);
    },
    enabled: !!threadId,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return {
    mutate: async (threadId: string) => {
      const service = await getService();
      await service.deleteThread(threadId);
      queryClient.invalidateQueries({ queryKey: queryKeys.chatThreads.all });
    },
  };
}
