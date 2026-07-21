import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminShell } from "../../components/admin/AdminShell";
import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { PageHeader } from "../../components/admin/PageHeader";
import { useAdminPaymentEvents } from "../../hooks/useAdminPaymentEvents";
import type { AdminPaymentEventRow } from "../../services/admin.service";
import { formatDateSafe } from "../../utils/format";

export function Payments() {
  const { t, i18n } = useTranslation();
  const eventsQuery = useAdminPaymentEvents(50);

  const columns: ColumnDef<AdminPaymentEventRow>[] = [
    {
      id: "received",
      header: () => t("admin.payments.columns.received"),
      cell: ({ row }) =>
        row.original.received_at
          ? formatDateSafe(row.original.received_at, i18n.language)
          : "—",
    },
    {
      id: "user",
      header: () => t("admin.payments.columns.user"),
      cell: ({ row }) => row.original.user_email ?? row.original.user_id ?? "—",
    },
    {
      id: "payment",
      header: () => t("admin.payments.columns.paymentId"),
      cell: ({ row }) => `#${row.original.payment_id}`,
    },
    {
      id: "topic",
      header: () => t("admin.payments.columns.topic"),
      cell: ({ row }) => row.original.topic,
    },
    {
      id: "action",
      header: () => t("admin.payments.columns.action"),
      cell: ({ row }) => row.original.action ?? "—",
    },
    {
      id: "signature",
      header: () => t("admin.payments.columns.signature"),
      cell: ({ row }) =>
        row.original.signature_valid ? (
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
      id: "processing",
      header: () => t("admin.payments.columns.processing"),
      cell: ({ row }) => row.original.processing_status,
    },
  ];

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
        <AdminDataTable
          loading={eventsQuery.isLoading}
          error={eventsQuery.error as Error | null}
          emptyMessage={t("admin.payments.empty")}
          rows={eventsQuery.data ?? []}
          rowKey={row => String(row.id)}
          columns={columns}
        />
      </div>
    </AdminShell>
  );
}
