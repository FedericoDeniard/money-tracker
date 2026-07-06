import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, FileText, FolderPlus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ReportFormModal } from "./ReportFormModal";
import { useReports } from "../../hooks/useReports";
import { useReportMutations } from "../../hooks/useReportMutations";
import type { ReportSummary } from "../../types/reports";

interface ReportSelectorProps {
  /** Current report id, or null if unassigned. */
  value: string | null;
  /** Called with the new id, or null to unassign. */
  onChange: (reportId: string | null) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function ReportSelector({
  value,
  onChange,
  disabled,
  label,
  className,
}: ReportSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: reports = [], isLoading } = useReports("active");
  const { createReport, isCreating } = useReportMutations();

  const active = reports.find(r => r.id === value) ?? null;

  const handleSelect = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <span className="block text-xs font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {active ? (
          <ActiveReportChip
            title={active.title}
            onRemove={disabled ? undefined : () => handleSelect(null)}
            removeLabel={t("reports.removeFromReport", "Remove from report")}
          />
        ) : (
          <span className="text-xs text-[var(--text-secondary)]">
            {t("reports.noReport", "No report")}
          </span>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isLoading}
              icon={<FolderPlus size={16} />}
              className="size-7 !p-0 rounded-full !text-[var(--primary)] shrink-0"
              aria-label={
                active
                  ? t("reports.changeReport", "Change report")
                  : t("reports.assignToReport", "Assign to report")
              }
              title={
                active
                  ? t("reports.changeReport", "Change report")
                  : t("reports.assignToReport", "Assign to report")
              }
            />
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-2">
            <p className="px-2 pb-2 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
              {t("reports.singleReportHint", "1 report per transaction")}
            </p>

            {active && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <X size={14} className="shrink-0" />
                {t("reports.removeFromReport", "Remove from report")}
              </button>
            )}

            <SelectorList
              reports={reports}
              value={value}
              onSelect={handleSelect}
            />

            <div className="border-t border-[var(--text-secondary)]/15 pt-1 mt-1">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                <FolderPlus size={14} />
                {t("reports.create", "New report")}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <ReportFormModal
        isOpen={creating}
        mode="create"
        onClose={() => setCreating(false)}
        onSubmit={async values => {
          const created = await createReport({
            title: values.title,
            description: values.description,
            dateRangeStart: values.dateRangeStart,
            dateRangeEnd: values.dateRangeEnd,
          });
          setCreating(false);
          setOpen(false);
          onChange(created.id);
        }}
        isSubmitting={isCreating}
      />
    </div>
  );
}

function SelectorList({
  reports,
  value,
  onSelect,
}: {
  reports: ReportSummary[];
  value: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation();

  if (reports.length === 0) {
    return (
      <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
        {t("reports.noReports", "No reports yet")}
      </p>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto space-y-0.5">
      {reports.map(report => {
        const selected = report.id === value;
        return (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm",
              selected
                ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                : "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            )}
          >
            <Check
              size={14}
              className={cn(
                "shrink-0",
                selected ? "opacity-100 text-[var(--primary)]" : "opacity-0"
              )}
            />
            <FileText
              size={14}
              className="shrink-0 text-[var(--text-secondary)]"
            />
            <span className="truncate flex-1">{report.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveReportChip({
  title,
  onRemove,
  removeLabel,
}: {
  title: string;
  onRemove?: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--text-secondary)]/15 px-2.5 py-1 text-xs">
      <FileText size={12} className="text-[var(--primary)]" />
      <span className="font-medium text-[var(--text-primary)] truncate max-w-[12rem]">
        {title}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="ml-1 rounded-full p-0.5 hover:bg-[var(--text-secondary)]/15"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
