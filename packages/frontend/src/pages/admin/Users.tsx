import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminTable } from "../../components/admin/AdminTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { RoleBadge } from "../../components/admin/RoleBadge";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { useAdminUsers } from "../../hooks/useAdminUsers";
import { Input } from "../../components/ui/shadcn/input";
import type { AdminUserRow } from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

export function Users() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const usersQuery = useAdminUsers({
    search: debouncedSearch || undefined,
    page: 0,
  });

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.users.title")}
        description={t("admin.users.description")}
        actions={
          <Input
            placeholder={t("admin.users.searchPlaceholder")}
            value={search}
            onChange={e => {
              const value = e.target.value;
              setSearch(value);
              window.clearTimeout(
                Number((window as { __adminSearchT?: number }).__adminSearchT)
              );
              (window as { __adminSearchT?: number }).__adminSearchT =
                window.setTimeout(() => setDebouncedSearch(value), 250);
            }}
            className="w-64"
          />
        }
      />

      <div className="mt-4">
        <AdminTable
          loading={usersQuery.isLoading}
          error={usersQuery.error as Error | null}
          emptyMessage={t("admin.users.empty")}
          rows={usersQuery.data ?? []}
          rowKey={row => row.user_id}
          onRowClick={row => navigate(`/admin/users/${row.user_id}`)}
          columns={[
            {
              key: "email",
              label: t("admin.users.columns.email"),
              render: (row: AdminUserRow) => (
                <span className="font-medium text-[var(--text-primary)]">
                  {row.email ?? "—"}
                </span>
              ),
            },
            {
              key: "name",
              label: t("admin.users.columns.name"),
              render: (row: AdminUserRow) => row.name ?? "—",
            },
            {
              key: "role",
              label: t("admin.users.columns.role"),
              render: (row: AdminUserRow) => <RoleBadge role={row.role} />,
            },
            {
              key: "plan",
              label: t("admin.users.columns.plan"),
              render: (row: AdminUserRow) => row.active_plan_key ?? "—",
            },
            {
              key: "status",
              label: t("admin.users.columns.status"),
              render: (row: AdminUserRow) => (
                <StatusBadge status={row.sub_status} />
              ),
            },
            {
              key: "created",
              label: t("admin.users.columns.createdAt"),
              render: (row: AdminUserRow) =>
                row.created_at
                  ? formatDateSafe(row.created_at, i18n.language)
                  : "—",
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
