import { useTranslation } from "react-i18next";
import { ReportCard } from "./ReportCard";
import type { ReportSummary } from "../../types/reports";

interface ReportListProps {
  reports: ReportSummary[];
  emptyAction?: () => void;
}

export function ReportList({ reports, emptyAction }: ReportListProps) {
  const { t } = useTranslation();

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-8">
        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t("reports.noReports", "No reports yet")}
        </p>
        {emptyAction && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={emptyAction}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {t("reports.create", "New report")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map(report => (
        <li key={report.id}>
          <ReportCard report={report} />
        </li>
      ))}
    </ul>
  );
}
