import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createTagsService } from "../services/tags.service";
import { queryKeys } from "../lib/query-client";
import type { Tag } from "../types/tags";
import type { TagColor } from "../constants/tags";
import type { TransactionTagLite } from "../types/tags";

interface UseTagMutationsReturn {
  createTag: (input: { name: string; color: TagColor }) => Promise<Tag>;
  updateTag: (input: {
    id: string;
    name?: string;
    color?: TagColor;
  }) => Promise<Tag>;
  deleteTag: (id: string) => Promise<string>;
  setTransactionTags: (input: {
    transactionId: string;
    tagIds: string[];
  }) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSettingTransactionTags: boolean;
}

export function useTagMutations(): UseTagMutationsReturn {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionTags.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  };

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; color: TagColor }) => {
      const supabase = await getSupabase();
      return createTagsService(supabase).createTag(input);
    },
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      color?: TagColor;
    }) => {
      const supabase = await getSupabase();
      const { id, ...updates } = input;
      return createTagsService(supabase).updateTag(id, updates);
    },
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabase();
      await createTagsService(supabase).deleteTag(id);
      return id;
    },
    onSuccess: invalidateAll,
  });

  const setTagsMutation = useMutation({
    mutationFn: async (input: { transactionId: string; tagIds: string[] }) => {
      const supabase = await getSupabase();
      await createTagsService(supabase).setTagsForTransaction(
        input.transactionId,
        input.tagIds
      );
    },
    onMutate: async ({ transactionId, tagIds }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.transactionTags.list(transactionId),
      });

      const previous = queryClient.getQueryData<TransactionTagLite[]>(
        queryKeys.transactionTags.list(transactionId)
      );

      const tagsData = queryClient.getQueryData<Tag[]>(queryKeys.tags.list());

      const deduped = Array.from(new Set(tagIds));
      const optimistic: TransactionTagLite[] = tagsData
        ? deduped
            .map(id => tagsData.find(t => t.id === id))
            .filter((t): t is Tag => !!t)
            .map(t => ({ id: t.id, name: t.name, color: t.color }))
        : [];

      queryClient.setQueryData<TransactionTagLite[]>(
        queryKeys.transactionTags.list(transactionId),
        optimistic
      );

      queryClient.setQueriesData<unknown>(
        { queryKey: queryKeys.transactions.all },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          return injectTagsIntoCache(
            old as Record<string, unknown>,
            transactionId,
            optimistic
          );
        }
      );

      return { previous };
    },
    onError: (_err, { transactionId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.transactionTags.list(transactionId),
          context.previous
        );
      }
    },
    onSuccess: invalidateAll,
  });

  return {
    createTag: createMutation.mutateAsync,
    updateTag: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutateAsync,
    setTransactionTags: setTagsMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSettingTransactionTags: setTagsMutation.isPending,
  };
}

// Walks an InfiniteData-shaped transactions cache and replaces the embedded
// tags for the given transactionId. Mirrors the structure produced by
// useTransactions / useAllTransactions (`{ pages: [{ transactions, ... }] }`).
function injectTagsIntoCache(
  old: Record<string, unknown>,
  transactionId: string,
  resolvedTags: TransactionTagLite[]
): Record<string, unknown> {
  const pages = old.pages;
  if (!Array.isArray(pages)) return old;

  return {
    ...old,
    pages: pages.map((page): Record<string, unknown> => {
      if (!page || typeof page !== "object")
        return page as Record<string, unknown>;
      const transactions = (page as { transactions?: unknown }).transactions;
      if (!Array.isArray(transactions)) return page as Record<string, unknown>;

      return {
        ...(page as Record<string, unknown>),
        transactions: transactions.map((t: unknown) => {
          if (
            !t ||
            typeof t !== "object" ||
            (t as { id?: unknown }).id !== transactionId
          ) {
            return t;
          }
          return { ...(t as Record<string, unknown>), tags: resolvedTags };
        }),
      };
    }),
  };
}
