import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "../../components/admin/AdminShell";
import { PageHeader } from "../../components/admin/PageHeader";
import { RoleBadge } from "../../components/admin/RoleBadge";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { ScopeBadge } from "../../components/admin/ScopeBadge";
import { AdminTable } from "../../components/admin/AdminTable";
import { useAdminUserDetail } from "../../hooks/useAdminUserDetail";
import { useAdminSetUserRole } from "../../hooks/useAdminSetUserRole";
import { useAdminUserUsageSummary } from "../../hooks/useAdminUserUsageSummary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/shadcn/select";
import { Button } from "../../components/ui/Button";
import type {
  AdminUserUsageSummaryRow,
  AppRole,
} from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

const ROLES: AppRole[] = ["user", "tester", "admin"];

export function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { t, i18n } = useTranslation();

  const detailQuery = useAdminUserDetail(userId);
  const usageQuery = useAdminUserUsageSummary(userId);
  const setRole = useAdminSetUserRole();

  const detail = detailQuery.data;
  const usage = usageQuery.data ?? [];

  if (detailQuery.isLoading) {
    return (
      <AdminShell>
        <div className="text-sm text-[var(--text-secondary)]">Loading…</div>
      </AdminShell>
    );
  }

  if (!detail) {
    return (
      <AdminShell>
        <div className="text-sm text-[var(--text-secondary)]">
          {t("admin.userDetail.notFound")}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} />
        {t("admin.userDetail.backToUsers")}
      </Link>

      <PageHeader
        title={detail.email ?? detail.user_id}
        description={t("admin.userDetail.description")}
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label={t("admin.userDetail.email")} value={detail.email ?? "—"} />
        <Card label={t("admin.userDetail.name")} value={detail.name ?? "—"} />
        <Card
          label={t("admin.userDetail.createdAt")}
          value={
            detail.created_at
              ? formatDateSafe(detail.created_at, i18n.language)
              : "—"
          }
        />
        <Card
          label={t("admin.userDetail.gmailConnected")}
          value={detail.has_gmail ? t("common.yes") : t("common.no")}
        />
      </section>

      <section className="mt-6 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("admin.userDetail.roleSection")}
        </h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <RoleBadge role={detail.role} />
          <Select
            value={detail.role ?? "user"}
            onValueChange={value => {
              setRole.mutate({
                userId: detail.user_id,
                role: value as AppRole,
              });
            }}
            disabled={setRole.isPending}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {setRole.isPending ? (
            <span className="text-xs text-[var(--text-secondary)]">
              {t("admin.userDetail.roleSaving")}
            </span>
          ) : null}
          {setRole.isError ? (
            <span className="text-xs text-red-600">
              {setRole.error?.message}
            </span>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          label={t("admin.userDetail.activePlan")}
          value={detail.active_plan_key ?? "—"}
        />
        <Card
          label={t("admin.userDetail.subStatus")}
          value={<StatusBadge status={detail.sub_status} />}
        />
        <Card
          label={t("admin.userDetail.subUpdated")}
          value={
            detail.sub_updated_at
              ? formatDateSafe(detail.sub_updated_at, i18n.language)
              : "—"
          }
        />
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {t("admin.userDetail.usageTitle")}
        </h3>
        <AdminTable
          loading={usageQuery.isLoading}
          error={usageQuery.error as Error | null}
          emptyMessage={t("admin.userDetail.usageEmpty")}
          rows={usage}
          rowKey={(row: AdminUserUsageSummaryRow) =>
            `${row.capability}-${row.period}`
          }
          columns={[
            {
              key: "capability",
              label: t("admin.usageLimits.columns.capability"),
              render: row => row.capability,
            },
            {
              key: "period",
              label: t("admin.usageLimits.columns.period"),
              render: row => row.period,
            },
            {
              key: "scope",
              label: t("admin.usageLimits.columns.scope"),
              render: row => (
                <ScopeBadge
                  scope={row.scope_kind as never}
                  value={row.scope_value}
                />
              ),
            },
            {
              key: "limit",
              label: t("admin.usageLimits.columns.maxCount"),
              render: row => row.resolved_limit.toLocaleString(),
              className: "text-right tabular-nums",
            },
            {
              key: "used",
              label: t("admin.usageLimits.columns.currentCount"),
              render: row => row.current_count.toLocaleString(),
              className: "text-right tabular-nums",
            },
          ]}
        />
      </section>

      <section className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={() => detailQuery.refetch()} size="sm">
          {t("common.refresh")}
        </Button>
      </section>
    </AdminShell>
  );
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="text-base text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
