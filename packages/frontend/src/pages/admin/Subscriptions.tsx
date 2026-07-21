import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminTable } from "../../components/admin/AdminTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { useAdminSubscriptions } from "../../hooks/useAdminSubscriptions";
import { useAdminCancelSubscription } from "../../hooks/useAdminCancelSubscription";
import { AdminSelect } from "../../components/admin/AdminSelect";
import { Button } from "../../components/ui/Button";
import type { AdminSubscriptionRow } from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

const STATUS_OPTIONS = [
  { value: "all", label: "all" },
  { value: "authorized", label: "authorized" },
  { value: "pending", label: "pending" },
  { value: "paused", label: "paused" },
  { value: "pending_cancellation", label: "pending_cancellation" },
  { value: "cancelled", label: "cancelled" },
] as const;

export function Subscriptions() {
  const { t, i18n } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const subsQuery = useAdminSubscriptions({
    status: statusFilter === "all" ? undefined : statusFilter,
    page: 0,
  });

  const cancel = useAdminCancelSubscription();

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.subscriptions.title")}
        description={t("admin.subscriptions.description")}
        actions={
          <AdminSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
        }
      />

      <div className="mt-4">
        <AdminTable
          loading={subsQuery.isLoading}
          error={subsQuery.error as Error | null}
          emptyMessage={t("admin.subscriptions.empty")}
          rows={subsQuery.data ?? []}
          rowKey={row => row.subscription_id}
          columns={[
            {
              key: "email",
              label: t("admin.subscriptions.columns.user"),
              render: (row: AdminSubscriptionRow) =>
                row.user_email ?? row.user_id ?? "—",
            },
            {
              key: "plan",
              label: t("admin.subscriptions.columns.plan"),
              render: row => row.plan_key ?? "—",
            },
            {
              key: "provider",
              label: t("admin.subscriptions.columns.provider"),
              render: row => row.provider,
            },
            {
              key: "amount",
              label: t("admin.subscriptions.columns.amount"),
              render: row =>
                row.transaction_amount != null && row.currency_id
                  ? `${row.currency_id} ${row.transaction_amount.toLocaleString()}`
                  : "—",
              className: "text-right tabular-nums",
            },
            {
              key: "status",
              label: t("admin.subscriptions.columns.status"),
              render: row => <StatusBadge status={row.status} />,
            },
            {
              key: "updated",
              label: t("admin.subscriptions.columns.updated"),
              render: row =>
                row.updated_at
                  ? formatDateSafe(row.updated_at, i18n.language)
                  : "—",
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
              render: row => {
                if (!row.user_id) return null;
                const isTerminal =
                  row.status === "cancelled" || row.status === "completed";
                if (isTerminal) return null;
                return (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancel.isPending}
                    onClick={() => {
                      cancel.mutate({
                        userId: row.user_id as string,
                        targetStatus: "pending_cancellation",
                      });
                    }}
                  >
                    {t("admin.subscriptions.cancel")}
                  </Button>
                );
              },
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
