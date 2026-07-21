import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminTable } from "../../components/admin/AdminTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { useAdminPaymentEvents } from "../../hooks/useAdminPaymentEvents";
import type { AdminPaymentEventRow } from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

export function Payments() {
  const { t, i18n } = useTranslation();
  const eventsQuery = useAdminPaymentEvents(50);

  return (
    <AdminShell>
      <PageHeader
        title={t("admin.payments.title")}
        description={t("admin.payments.description")}
      />

      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {t("admin.payments.rawWarning")}
      </p>

      <div className="mt-4">
        <AdminTable
          loading={eventsQuery.isLoading}
          error={eventsQuery.error as Error | null}
          emptyMessage={t("admin.payments.empty")}
          rows={eventsQuery.data ?? []}
          rowKey={row => String(row.id)}
          columns={[
            {
              key: "received",
              label: t("admin.payments.columns.received"),
              render: (row: AdminPaymentEventRow) =>
                row.received_at
                  ? formatDateSafe(row.received_at, i18n.language)
                  : "—",
            },
            {
              key: "user",
              label: t("admin.payments.columns.user"),
              render: row => row.user_email ?? row.user_id ?? "—",
            },
            {
              key: "payment",
              label: t("admin.payments.columns.paymentId"),
              render: row => `#${row.payment_id}`,
              className: "tabular-nums",
            },
            {
              key: "topic",
              label: t("admin.payments.columns.topic"),
              render: row => row.topic,
            },
            {
              key: "action",
              label: t("admin.payments.columns.action"),
              render: row => row.action ?? "—",
            },
            {
              key: "signature",
              label: t("admin.payments.columns.signature"),
              render: row =>
                row.signature_valid ? (
                  <span className="text-emerald-600">
                    {t("admin.payments.signatureOk")}
                  </span>
                ) : (
                  <span className="text-red-600">
                    {t("admin.payments.signatureBad")}
                  </span>
                ),
            },
            {
              key: "processing",
              label: t("admin.payments.columns.processing"),
              render: row => row.processing_status,
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
