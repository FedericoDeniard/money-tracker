import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminTable } from "../../components/admin/AdminTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { useAdminSeeds } from "../../hooks/useAdminSeeds";
import { useAdminRetrySeed } from "../../hooks/useAdminRetrySeed";
import { Button } from "../../components/ui/Button";
import type { AdminSeedRow } from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

export function Seeds() {
  const { t, i18n } = useTranslation();
  const seedsQuery = useAdminSeeds({ limit: 100 });
  const retry = useAdminRetrySeed();

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.seeds.title")}
        description={t("admin.seeds.description")}
      />

      <div className="mt-4">
        <AdminTable
          loading={seedsQuery.isLoading}
          error={seedsQuery.error as Error | null}
          emptyMessage={t("admin.seeds.empty")}
          rows={seedsQuery.data ?? []}
          rowKey={row => row.id}
          columns={[
            {
              key: "user",
              label: t("admin.seeds.columns.user"),
              render: (row: AdminSeedRow) =>
                row.user_email ?? row.user_id ?? "—",
            },
            {
              key: "gmail",
              label: t("admin.seeds.columns.gmail"),
              render: row => row.gmail_email ?? "—",
            },
            {
              key: "status",
              label: t("admin.seeds.columns.status"),
              render: row => <StatusBadge status={row.status} />,
            },
            {
              key: "progress",
              label: t("admin.seeds.columns.progress"),
              render: row =>
                `${row.transactions_found ?? 0}/${row.total_emails ?? 0}`,
              className: "tabular-nums",
            },
            {
              key: "updated",
              label: t("admin.seeds.columns.updated"),
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
                const canRetry =
                  row.status === "failed" || row.status === "completed";
                if (!canRetry) return null;
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={
                      retry.isPending && retry.variables?.seedId === row.id
                    }
                    onClick={() =>
                      retry.mutate({
                        seedId: row.id,
                        connectionId: row.user_oauth_token_id,
                      })
                    }
                  >
                    {t("admin.seeds.retry")}
                  </Button>
                );
              },
            },
          ]}
        />
      </div>

      {retry.isError ? (
        <p className="mt-2 text-sm text-red-600">{retry.error.message}</p>
      ) : null}
    </AdminShell>
  );
}
