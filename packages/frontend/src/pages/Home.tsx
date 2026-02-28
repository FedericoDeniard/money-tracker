import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarClock,
  Mail,
  ReceiptText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Button } from "../components/ui/Button";
import { TransactionFormModal } from "../components/transactions/TransactionFormModal";
import type { TransactionFormData } from "../components/transactions/TransactionFormModal";
import { QuickActionCard } from "../components/dashboard/QuickActionCard";
import { TaskListItem } from "../components/dashboard/TaskListItem";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useSeedNotifications } from "../hooks/useSeedNotifications";
import { useDashboardTasks } from "../hooks/useDashboardTasks";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { gmailService } from "../services/gmail.service";
import { toast } from "../utils/toast";
import type { DashboardTask } from "../hooks/useDashboardTasks";
import { mapTransactionFormDataToInsert } from "../utils/transactionForm";
import { startSeedWithFeedback } from "../utils/seedImport";

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useSeedNotifications(user?.id);

  const { createTransaction } = useTransactionMutations();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    data,
    isLoading: loading,
    refetch,
  } = useDashboardTasks(user?.id);

  const handleCreateTransaction = async (formData: TransactionFormData) => {
    await createTransaction(mapTransactionFormDataToInsert(formData));
  };

  const handleConnectGmail = async () => {
    try {
      await gmailService.connectGmail();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("dashboardActionFirst.errors.connectGmail");
      toast.error(t("common.error"), message);
    }
  };

  const handleForceSync = async (connectionId?: string | null) => {
    if (!connectionId) return;

    try {
      setIsSyncing(true);
      const started = await startSeedWithFeedback(connectionId, t);
      if (started) {
        await refetch();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const dashboardData = data ?? {
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

  const getTaskContent = (task: DashboardTask) => {
    switch (task.type) {
      case "review_fallback":
        return {
          title: t("dashboardActionFirst.tasks.reviewFallback.title"),
          description: t("dashboardActionFirst.tasks.reviewFallback.description", {
            count: task.count ?? 0,
          }),
          actionLabel: t("dashboardActionFirst.tasks.reviewFallback.action"),
        };
      case "review_uncategorized":
        return {
          title: t("dashboardActionFirst.tasks.reviewUncategorized.title"),
          description: t("dashboardActionFirst.tasks.reviewUncategorized.description", {
            count: task.count ?? 0,
          }),
          actionLabel: t("dashboardActionFirst.tasks.reviewUncategorized.action"),
        };
      case "reconnect_gmail":
        return {
          title: t("dashboardActionFirst.tasks.reconnectGmail.title"),
          description: t("dashboardActionFirst.tasks.reconnectGmail.description", {
            count: task.count ?? 0,
          }),
          actionLabel: t("dashboardActionFirst.tasks.reconnectGmail.action"),
        };
      case "renew_watch":
        return {
          title: t("dashboardActionFirst.tasks.renewWatch.title"),
          description: t("dashboardActionFirst.tasks.renewWatch.description", {
            count: task.count ?? 0,
          }),
          actionLabel: t("dashboardActionFirst.tasks.renewWatch.action"),
        };
      case "seed_processing":
        return {
          title: t("dashboardActionFirst.tasks.seedProcessing.title"),
          description: t("dashboardActionFirst.tasks.seedProcessing.description", {
            totalEmails: task.totalEmails ?? 0,
            processedByAi: task.processedByAi ?? 0,
          }),
          actionLabel: undefined,
        };
      case "seed_failed":
        return {
          title: t("dashboardActionFirst.tasks.seedFailed.title"),
          description:
            task.errorMessage || t("dashboardActionFirst.tasks.seedFailed.description"),
          actionLabel: t("dashboardActionFirst.tasks.seedFailed.action"),
        };
      default:
        return {
          title: "",
          description: "",
          actionLabel: undefined,
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("navigation.dashboard")}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("dashboardActionFirst.headerDescription")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={16} />}
            onClick={() => refetch()}
          >
            {t("common.refresh")}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {t("dashboardActionFirst.badges.pending")}: {dashboardData.tasks.length}
          </span>
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {t("dashboardActionFirst.badges.activeConnections")}:{" "}
            {dashboardData.activeConnectionCount}
          </span>
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {t("dashboardActionFirst.badges.toReview")}: {dashboardData.uncategorizedCount}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard
          title={t("dashboardActionFirst.quickActions.addTransaction.title")}
          description={t("dashboardActionFirst.quickActions.addTransaction.description")}
          icon={<ReceiptText size={18} />}
          actionLabel={t("transactions.addManually")}
          onClick={() => setIsCreateModalOpen(true)}
        />
        <QuickActionCard
          title={t("dashboardActionFirst.quickActions.connectGmail.title")}
          description={t("dashboardActionFirst.quickActions.connectGmail.description")}
          icon={<Mail size={18} />}
          actionLabel={t("dashboardActionFirst.quickActions.connectGmail.action")}
          onClick={handleConnectGmail}
        />
        <QuickActionCard
          title={t("dashboardActionFirst.quickActions.forceSync.title")}
          description={t("dashboardActionFirst.quickActions.forceSync.description")}
          icon={<RefreshCw size={18} />}
          actionLabel={
            isSyncing
              ? t("dashboardActionFirst.quickActions.forceSync.syncing")
              : t("dashboardActionFirst.quickActions.forceSync.action")
          }
          onClick={() => handleForceSync(dashboardData.primaryConnectionId)}
          disabled={!dashboardData.primaryConnectionId || isSyncing}
          badge={
            dashboardData.primaryConnectionId
              ? t("dashboardActionFirst.quickActions.forceSync.available")
              : t("dashboardActionFirst.quickActions.forceSync.noConnection")
          }
        />
        <QuickActionCard
          title={t("dashboardActionFirst.quickActions.openTransactions.title")}
          description={t("dashboardActionFirst.quickActions.openTransactions.description")}
          icon={<CalendarClock size={18} />}
          actionLabel={t("dashboardActionFirst.quickActions.openTransactions.action")}
          href="/transactions"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {t("dashboardActionFirst.smartTasks.title")}
              </h2>
              <Link
                to="/settings"
                className="text-sm font-medium text-[var(--button-primary)] hover:underline"
              >
                {t("dashboardActionFirst.smartTasks.manageConnections")}
              </Link>
            </div>

            <div className="space-y-3">
              {dashboardData.tasks.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70">
                  <EmptyState
                    icon={Sparkles}
                    title={t("dashboardActionFirst.smartTasks.empty")}
                  />
                </div>
              ) : (
                dashboardData.tasks.map((task) => {
                  const taskContent = getTaskContent(task);
                  return (
                    <TaskListItem
                      key={task.id}
                      title={taskContent.title}
                      description={taskContent.description}
                      level={task.level}
                      levelLabel={t(`dashboardActionFirst.priority.${task.level}`)}
                      actionLabel={taskContent.actionLabel}
                      actionPath={task.type === "seed_failed" ? undefined : task.actionPath}
                      onAction={
                        task.type === "seed_failed"
                          ? () => handleForceSync(task.connectionId)
                          : undefined
                      }
                      disabled={task.type === "seed_failed" && isSyncing}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <Sparkles size={18} />
              {t("dashboardActionFirst.aiActivity.title")}
            </h2>

            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("dashboardActionFirst.aiActivity.processedEmails")}
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {dashboardData.activity.emailsProcessedByAi}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("dashboardActionFirst.aiActivity.foundTransactions")}
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {dashboardData.activity.transactionsFound}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("dashboardActionFirst.aiActivity.skippedEmails")}
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {dashboardData.activity.skippedEmails}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <Activity size={18} />
              {t("dashboardActionFirst.quickStatus.title")}
            </h2>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li>
                {t("dashboardActionFirst.quickStatus.uncategorized")}:{" "}
                {dashboardData.uncategorizedCount}
              </li>
              <li>
                {t("dashboardActionFirst.quickStatus.aiFallback")}:{" "}
                {dashboardData.fallbackCount}
              </li>
              <li>
                {t("dashboardActionFirst.quickStatus.reconnections")}:{" "}
                {dashboardData.inactiveConnectionsCount}
              </li>
              <li>
                {t("dashboardActionFirst.quickStatus.expiringWatches")}:{" "}
                {dashboardData.expiringWatchCount}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <TransactionFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTransaction}
        mode="create"
      />
    </div>
  );
}
