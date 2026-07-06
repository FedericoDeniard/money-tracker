import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { createReportsService } from "../services/reports.service";
import { queryKeys } from "../lib/query-client";
import type {
  ReportStatus,
  ReportSummary,
  ReportTransactionListItem,
} from "../types/reports";

const STALE_TIME = 5 * 60 * 1000;

export function useReports(status: ReportStatus) {
  return useQuery<ReportSummary[]>({
    queryKey: queryKeys.reports.list(status),
    queryFn: async () => {
      const supabase = await getSupabase();
      return createReportsService(supabase).listReports(status);
    },
    staleTime: STALE_TIME,
  });
}

export function useReport(id: string | undefined) {
  return useQuery<ReportSummary | null>({
    queryKey: queryKeys.reports.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;
      const supabase = await getSupabase();
      return createReportsService(supabase).getReportById(id);
    },
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export interface ReportTransactionsPage {
  items: ReportTransactionListItem[];
  total: number;
}

export function useReportTransactions(
  reportId: string | undefined,
  pagination?: { from: number; to: number }
) {
  return useQuery<ReportTransactionsPage>({
    queryKey: [
      ...queryKeys.reports.transactions(reportId ?? ""),
      pagination?.from ?? 0,
      pagination?.to ?? 0,
    ],
    queryFn: async () => {
      if (!reportId) return { items: [], total: 0 };
      const supabase = await getSupabase();
      return createReportsService(supabase).getTransactionsForReport(
        reportId,
        pagination
      );
    },
    enabled: !!reportId,
    staleTime: STALE_TIME,
  });
}
