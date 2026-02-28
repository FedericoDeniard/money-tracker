import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-client";

const WATCH_WARNING_HOURS = 72;
const ACTIVITY_WINDOW_DAYS = 7;

export interface DashboardTask {
  id: string;
  type:
    | "review_uncategorized"
    | "review_fallback"
    | "reconnect_gmail"
    | "renew_watch"
    | "seed_processing"
    | "seed_failed";
  count?: number;
  totalEmails?: number;
  processedByAi?: number;
  errorMessage?: string | null;
  level: "info" | "warning" | "critical";
  actionPath?: string;
  connectionId?: string;
}

interface SeedSummary {
  processing: {
    totalEmails: number;
    processedByAi: number;
  } | null;
  failed: {
    connectionId: string;
    errorMessage: string | null;
  } | null;
}

export interface DashboardActivitySummary {
  emailsProcessedByAi: number;
  transactionsFound: number;
  skippedEmails: number;
}

export interface DashboardTasksData {
  tasks: DashboardTask[];
  uncategorizedCount: number;
  fallbackCount: number;
  inactiveConnectionsCount: number;
  expiringWatchCount: number;
  activeConnectionCount: number;
  primaryConnectionId: string | null;
  activity: DashboardActivitySummary;
}

function parseWatchExpiration(expiration: string | null): Date | null {
  if (!expiration) return null;

  // Gmail expiration can arrive as milliseconds timestamp string.
  if (/^\d+$/.test(expiration)) {
    const numeric = Number(expiration);
    if (!Number.isNaN(numeric)) {
      return new Date(numeric);
    }
  }

  const parsed = new Date(expiration);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getSeedSummary(
  rows: Array<{
    status: "pending" | "completed" | "failed" | "processing";
    total_emails: number | null;
    emails_processed_by_ai: number | null;
    user_oauth_token_id: string;
    error_message: string | null;
  }>,
): SeedSummary {
  const processingRow = rows.find((row) => row.status === "processing");
  const failedRow = rows.find((row) => row.status === "failed");

  return {
    processing: processingRow
      ? {
          totalEmails: processingRow.total_emails ?? 0,
          processedByAi: processingRow.emails_processed_by_ai ?? 0,
        }
      : null,
    failed: failedRow
      ? {
          connectionId: failedRow.user_oauth_token_id,
          errorMessage: failedRow.error_message,
        }
      : null,
  };
}

export function useDashboardTasks(userId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.tasks(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DashboardTasksData> => {
      if (!userId) {
        return {
          tasks: [],
          uncategorizedCount: 0,
          fallbackCount: 0,
          inactiveConnectionsCount: 0,
          expiringWatchCount: 0,
          activeConnectionCount: 0,
          primaryConnectionId: null,
          activity: {
            emailsProcessedByAi: 0,
            transactionsFound: 0,
            skippedEmails: 0,
          },
        };
      }

      const supabase = await getSupabase();
      const now = new Date();
      const watchWarningThreshold = new Date(
        now.getTime() + WATCH_WARNING_HOURS * 60 * 60 * 1000,
      );
      const activityStart = new Date(
        now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );

      const [
        uncategorizedResult,
        fallbackResult,
        inactiveConnectionsResult,
        watchesResult,
        activeConnectionsResult,
        seedsStateResult,
        emailTransactionsActivityResult,
        discardedEmailsActivityResult,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("category", ["uncategorized", "other"]),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("category", "uncategorized")
          .eq("amount", 0),
        supabase
          .from("user_oauth_tokens")
          .select("id, gmail_email")
          .eq("user_id", userId)
          .eq("is_active", false),
        supabase
          .from("gmail_watches")
          .select("id, gmail_email, expiration")
          .eq("user_id", userId)
          .eq("is_active", true),
        supabase
          .from("user_oauth_tokens")
          .select("id, gmail_email")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("seeds")
          .select(
            "status, total_emails, emails_processed_by_ai, user_oauth_token_id, error_message, updated_at",
          )
          .eq("user_id", userId)
          .in("status", ["processing", "failed"])
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("source_message_id", "")
          .neq("source_email", "")
          .gte("created_at", activityStart.toISOString()),
        supabase
          .from("discarded_emails")
          .select("id, user_oauth_tokens!inner(user_id)", {
            count: "exact",
            head: true,
          })
          .eq("user_oauth_tokens.user_id", userId)
          .gte("discarded_at", activityStart.toISOString()),
      ]);

      if (uncategorizedResult.error) throw uncategorizedResult.error;
      if (fallbackResult.error) throw fallbackResult.error;
      if (inactiveConnectionsResult.error) throw inactiveConnectionsResult.error;
      if (watchesResult.error) throw watchesResult.error;
      if (activeConnectionsResult.error) throw activeConnectionsResult.error;
      if (seedsStateResult.error) throw seedsStateResult.error;
      if (emailTransactionsActivityResult.error) {
        throw emailTransactionsActivityResult.error;
      }
      if (discardedEmailsActivityResult.error) {
        throw discardedEmailsActivityResult.error;
      }

      const uncategorizedCount = uncategorizedResult.count ?? 0;
      const fallbackCount = fallbackResult.count ?? 0;
      const inactiveConnectionsCount = inactiveConnectionsResult.data.length;

      const expiringWatchCount = watchesResult.data.filter((watch) => {
        const expirationDate = parseWatchExpiration(watch.expiration);
        if (!expirationDate) return false;
        return expirationDate <= watchWarningThreshold;
      }).length;

      const activeConnectionCount = activeConnectionsResult.data.length;
      const primaryConnectionId = activeConnectionsResult.data[0]?.id ?? null;

      const seedSummary = getSeedSummary(seedsStateResult.data);
      const transactionsFound = emailTransactionsActivityResult.count ?? 0;
      const skippedEmails = discardedEmailsActivityResult.count ?? 0;
      const activity = {
        emailsProcessedByAi: transactionsFound + skippedEmails,
        transactionsFound,
        skippedEmails,
      };

      const tasks: DashboardTask[] = [];

      if (fallbackCount > 0) {
        tasks.push({
          id: "fallback-review",
          type: "review_fallback",
          count: fallbackCount,
          level: "critical",
          actionPath: "/transactions",
        });
      }

      if (uncategorizedCount > 0) {
        tasks.push({
          id: "uncategorized-review",
          type: "review_uncategorized",
          count: uncategorizedCount,
          level: "warning",
          actionPath: "/transactions",
        });
      }

      if (inactiveConnectionsCount > 0) {
        tasks.push({
          id: "reconnect-gmail",
          type: "reconnect_gmail",
          count: inactiveConnectionsCount,
          level: "warning",
          actionPath: "/settings",
        });
      }

      if (expiringWatchCount > 0) {
        tasks.push({
          id: "renew-watch",
          type: "renew_watch",
          count: expiringWatchCount,
          level: "info",
          actionPath: "/settings",
        });
      }

      if (seedSummary.processing) {
        tasks.push({
          id: "seed-processing",
          type: "seed_processing",
          totalEmails: seedSummary.processing.totalEmails,
          processedByAi: seedSummary.processing.processedByAi,
          level: "info",
        });
      }

      if (seedSummary.failed) {
        tasks.push({
          id: "seed-failed",
          type: "seed_failed",
          errorMessage: seedSummary.failed.errorMessage,
          level: "critical",
          connectionId: seedSummary.failed.connectionId,
        });
      }

      return {
        tasks,
        uncategorizedCount,
        fallbackCount,
        inactiveConnectionsCount,
        expiringWatchCount,
        activeConnectionCount,
        primaryConnectionId,
        activity,
      };
    },
  });
}
