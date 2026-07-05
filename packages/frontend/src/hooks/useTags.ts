import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createTagsService } from "../services/tags.service";
import { queryKeys } from "../lib/query-client";
import type { Tag, TransactionTagLite } from "../types/tags";

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const supabase = await getSupabase();
      return createTagsService(supabase).listTags();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransactionTags(transactionId: string | undefined) {
  return useQuery<TransactionTagLite[]>({
    queryKey: queryKeys.transactionTags.list(transactionId ?? ""),
    queryFn: async () => {
      if (!transactionId) return [];
      const supabase = await getSupabase();
      return createTagsService(supabase).getTagsForTransaction(transactionId);
    },
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000,
  });
}
