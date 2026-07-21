import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminDataTable } from "../../components/admin/AdminDataTable";
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

  const columns: ColumnDef<AdminSeedRow>[] = [
    {
      id: "user",
      header: () => t("admin.seeds.columns.user"),
      cell: ({ row }) => row.original.user_email ?? row.original.user_id ?? "—",
    },
    {
      id: "gmail",
      header: () => t("admin.seeds.columns.gmail"),
      cell: ({ row }) => row.original.gmail_email ?? "—",
    },
    {
      id: "status",
      header: () => t("admin.seeds.columns.status"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "progress",
      header: () => t("admin.seeds.columns.progress"),
      cell: ({ row }) =>
        `${row.original.transactions_found ?? 0}/${row.original.total_emails ?? 0}`,
    },
    {
      id: "updated",
      header: () => t("admin.seeds.columns.updated"),
      cell: ({ row }) =>
        row.original.updated_at
          ? formatDateSafe(row.original.updated_at, i18n.language)
          : "—",
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const canRetry =
          row.original.status === "failed" ||
          row.original.status === "completed";
        if (!canRetry) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            loading={
              retry.isPending && retry.variables?.seedId === row.original.id
            }
            onClick={() =>
              retry.mutate({
                seedId: row.original.id,
                connectionId: row.original.user_oauth_token_id,
              })
            }
          >
            {t("admin.seeds.retry")}
          </Button>
        );
      },
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.seeds.title")}
        description={t("admin.seeds.description")}
      />

      <div className="mt-4">
        <AdminDataTable
          loading={seedsQuery.isLoading}
          error={seedsQuery.error as Error | null}
          emptyMessage={t("admin.seeds.empty")}
          rows={seedsQuery.data ?? []}
          rowKey={row => row.id}
          columns={columns}
        />
      </div>

      {retry.isError ? (
        <p className="mt-2 text-sm text-red-600">{retry.error.message}</p>
      ) : null}
    </AdminShell>
  );
}
