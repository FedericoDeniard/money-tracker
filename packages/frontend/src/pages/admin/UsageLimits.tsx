import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminTable } from "../../components/admin/AdminTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { ScopeBadge } from "../../components/admin/ScopeBadge";
import { useAdminUsageLimits } from "../../hooks/useAdminUsageLimits";
import { useAdminUserUsageSummary } from "../../hooks/useAdminUserUsageSummary";
import { useAdminTopConsumers } from "../../hooks/useAdminTopConsumers";
import { AdminInput } from "../../components/admin/AdminInput";
import { AdminSelect } from "../../components/admin/AdminSelect";
import type {
  AdminTopConsumerRow,
  AdminUsageLimitRow,
  AdminUserUsageSummaryRow,
  Capability,
} from "../../services/admin.service";

const CAPABILITIES: Capability[] = [
  "gmail_sync",
  "ai_assistant",
  "push_notifications",
  "process_documents",
  "report_pdf_export",
];

function startOfCurrentMonth(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

export function UsageLimits() {
  const { t } = useTranslation();
  const [userLookupId, setUserLookupId] = useState("");
  const [activeLookupId, setActiveLookupId] = useState<string | null>(null);
  const [topCapability, setTopCapability] =
    useState<Capability>("ai_assistant");

  const limitsQuery = useAdminUsageLimits();
  const userSummaryQuery = useAdminUserUsageSummary(
    activeLookupId ?? undefined
  );
  const topConsumersQuery = useAdminTopConsumers({
    capability: topCapability,
    periodStart: startOfCurrentMonth(),
    limit: 10,
  });

  const limits = limitsQuery.data ?? [];
  const userSummary = userSummaryQuery.data ?? [];
  const topConsumers = topConsumersQuery.data ?? [];

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.usageLimits.title")}
        description={t("admin.usageLimits.description")}
      />

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {t("admin.usageLimits.configuredTitle")}
        </h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          {t("admin.usageLimits.configuredHint")}
        </p>
        <AdminTable
          loading={limitsQuery.isLoading}
          error={limitsQuery.error as Error | null}
          emptyMessage={t("admin.usageLimits.empty")}
          rows={limits}
          rowKey={(row: AdminUsageLimitRow) =>
            `${row.capability}-${row.scope_kind}-${row.scope_value ?? "default"}-${row.period}`
          }
          columns={[
            {
              key: "capability",
              label: t("admin.usageLimits.columns.capability"),
              render: row => row.capability,
            },
            {
              key: "scope",
              label: t("admin.usageLimits.columns.scope"),
              render: row => (
                <ScopeBadge scope={row.scope_kind} value={row.scope_value} />
              ),
            },
            {
              key: "period",
              label: t("admin.usageLimits.columns.period"),
              render: row => row.period,
            },
            {
              key: "max",
              label: t("admin.usageLimits.columns.maxCount"),
              render: row => row.max_count.toLocaleString(),
              className: "text-right tabular-nums",
            },
            {
              key: "affected",
              label: t("admin.usageLimits.columns.affectedUsers"),
              render: row => row.affected_users.toLocaleString(),
              className: "text-right tabular-nums",
            },
          ]}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("admin.usageLimits.topConsumersTitle")}
          </h3>
          <AdminSelect
            value={topCapability}
            onChange={e => setTopCapability(e.target.value as Capability)}
            className="w-56"
          >
            {CAPABILITIES.map(cap => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </AdminSelect>
        </div>
        <AdminTable
          loading={topConsumersQuery.isLoading}
          error={topConsumersQuery.error as Error | null}
          emptyMessage={t("admin.usageLimits.topConsumersEmpty")}
          rows={topConsumers}
          rowKey={(row: AdminTopConsumerRow) => row.user_id}
          columns={[
            {
              key: "user",
              label: t("admin.usageLimits.columns.user"),
              render: row => row.user_email ?? row.user_id,
            },
            {
              key: "count",
              label: t("admin.usageLimits.columns.currentCount"),
              render: row => row.count.toLocaleString(),
              className: "text-right tabular-nums",
            },
          ]}
        />
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {t("admin.usageLimits.userLookupTitle")}
        </h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          {t("admin.usageLimits.userLookupHint")}
        </p>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (userLookupId.trim().length > 0) {
              setActiveLookupId(userLookupId.trim());
            }
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <AdminInput
            placeholder={t("admin.usageLimits.userLookupPlaceholder")}
            value={userLookupId}
            onChange={e => setUserLookupId(e.target.value)}
            className="sm:w-96"
          />
        </form>
        <div className="mt-4">
          <AdminTable
            loading={userSummaryQuery.isLoading}
            error={userSummaryQuery.error as Error | null}
            emptyMessage={
              activeLookupId
                ? t("admin.usageLimits.userLookupEmpty")
                : t("admin.usageLimits.userLookupInactive")
            }
            rows={userSummary}
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
                key: "period",
                label: t("admin.usageLimits.columns.period"),
                render: row => row.period,
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
        </div>
      </section>
    </AdminShell>
  );
}
