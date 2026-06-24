import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import {
  createTransactionAttachmentsService,
  type TransactionAttachment,
} from "../services/transaction-attachments.service";
import { queryKeys } from "../lib/query-client";

export function useTransactionAttachments(transactionId: string) {
  return useQuery<TransactionAttachment[]>({
    queryKey: queryKeys.transactionAttachments.list(transactionId),
    queryFn: async () => {
      const supabase = await getSupabase();
      const service = createTransactionAttachmentsService(supabase);
      return service.getTransactionAttachments(transactionId);
    },
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000,
  });
}
