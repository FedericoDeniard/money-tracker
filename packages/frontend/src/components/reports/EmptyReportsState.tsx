import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../ui/EmptyState";

interface EmptyReportsStateProps {
  variant?: "active" | "archived";
  onCreate?: () => void;
}

export function EmptyReportsState({
  variant = "active",
  onCreate,
}: EmptyReportsStateProps) {
  const { t } = useTranslation();
  const isArchived = variant === "archived";

  return (
    <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
      <EmptyState
        icon={FileText}
        title={t(
          isArchived ? "reports.archivedEmpty" : "reports.noReports",
          isArchived ? "No archived reports" : "No reports yet"
        )}
        description={t(
          isArchived
            ? "reports.archivedEmptyDescription"
            : "reports.emptyDescription",
          isArchived
            ? "Reports you archive will appear here for later reference."
            : "Group related transactions to review, export, or analyze them together."
        )}
        action={
          isArchived || !onCreate
            ? undefined
            : {
                label: t("reports.create", "New report"),
                onClick: onCreate,
              }
        }
      />
    </div>
  );
}
