import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ReportStatusTabs } from "../components/reports/ReportStatusTabs";
import { ReportFormModal } from "../components/reports/ReportFormModal";
import { ReportsContent } from "../components/reports/ReportsContent";
import { useReportMutations } from "../hooks/useReportMutations";
import type { ReportStatus } from "../types/reports";

export function Reports() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReportStatus>("active");
  const [createOpen, setCreateOpen] = useState(false);

  const { createReport, isCreating } = useReportMutations();

  const handleCreate = async (values: {
    title: string;
    description: string | null;
    dateRangeStart: string | null;
    dateRangeEnd: string | null;
  }) => {
    try {
      await createReport({
        title: values.title,
        description: values.description,
        dateRangeStart: values.dateRangeStart,
        dateRangeEnd: values.dateRangeEnd,
      });
      toast.success(t("reports.header.createSuccess"));
      setCreateOpen(false);
    } catch (error) {
      toast.error(t("reports.header.saveError"));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm">
        <div className="flex flex-row items-start justify-between gap-2 md:gap-4 md:items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
              {t("reports.title", "Reports")}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
              {t("reports.description", "Group related transactions.")}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            className="shrink-0"
          >
            <span className="hidden sm:inline">
              {t("reports.create", "New report")}
            </span>
            <span className="sm:hidden">{t("reports.create", "New")}</span>
          </Button>
        </div>
      </section>

      <ReportStatusTabs value={status} onChange={setStatus} />

      <ReportsContent
        status={status}
        onCreate={status === "active" ? () => setCreateOpen(true) : undefined}
      />

      <ReportFormModal
        isOpen={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />
    </div>
  );
}
