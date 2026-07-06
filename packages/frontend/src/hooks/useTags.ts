import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createTagsService } from "../services/tags.service";
import { queryKeys } from "../lib/query-client";
import type { Tag } from "../types/tags";

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
