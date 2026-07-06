import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Transaction } from "../services/transactions.service";

const NO_TRANSACTION: Transaction | null = null;

/**
 * Returns the live `Transaction` for the given id, reading from any
 * `transactions.*` cache entry that's currently populated. Re-renders
 * whenever the query cache changes (optimistic update, refetch, etc.)
 * — no extra DB round-trip when the transaction is already cached.
 *
 * Implementation note: we use `useSyncExternalStore` (React's canonical
 * pattern for external store subscriptions) rather than `useReducer`
 * + a force-render counter. `useSyncExternalStore` compares snapshots
 * with `Object.is`, so returning the same Transaction reference from
 * cache yields no re-render — closing the loop that React's
 * "Maximum update depth" guard was catching.
 *
 * Why the parent uses just an id: `Transactions.tsx` keeps the user's
 * selection in `useReducer` state. With only the id stored and the
 * transaction derived live from the cache, every optimistic mutation
 * (tag edits, report assignments, archive, etc.) flows into the
 * `TransactionDetail` panel automatically — no manual `setState`
 * plumbing per mutation.
 */
export function useLiveTransaction(
  id: string | null | undefined
): Transaction | null {
  const queryClient = useQueryClient();

  const subscribe = (onChange: () => void) => {
    return queryClient.getQueryCache().subscribe(onChange);
  };

  const getSnapshot = (): Transaction | null => {
    if (!id) return NO_TRANSACTION;

    const entries = queryClient.getQueryCache().getAll();
    for (const entry of entries) {
      const key = entry.queryKey;
      if (!Array.isArray(key) || key[0] !== "transactions") continue;
      const data = entry.state.data;
      if (!data || typeof data !== "object") continue;

      // InfiniteData shape — produced by `useInfiniteQuery` /
      // `useSuspenseInfiniteQuery` (transactions list).
      const pages = (data as { pages?: unknown }).pages;
      if (Array.isArray(pages)) {
        for (const page of pages) {
          const txs = (page as { transactions?: unknown }).transactions;
          if (!Array.isArray(txs)) continue;
          for (const tx of txs) {
            if (
              tx &&
              typeof tx === "object" &&
              (tx as { id?: string }).id === id
            ) {
              return tx as Transaction;
            }
          }
        }
        continue;
      }

      // Plain array — for queries that store a flat list.
      if (Array.isArray(data)) {
        for (const tx of data) {
          if (
            tx &&
            typeof tx === "object" &&
            (tx as { id?: string }).id === id
          ) {
            return tx as Transaction;
          }
        }
      }
    }

    return NO_TRANSACTION;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
