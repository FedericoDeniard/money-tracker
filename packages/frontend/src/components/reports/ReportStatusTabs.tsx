import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import type { ReportStatus } from "../../types/reports";

interface ReportStatusTabsProps {
  value: ReportStatus;
  onChange: (next: ReportStatus) => void;
}

const TABS: ReportStatus[] = ["active", "archived"];

export function ReportStatusTabs({ value, onChange }: ReportStatusTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-1 w-full lg:w-auto overflow-x-auto">
      {TABS.map(tab => {
        const selected = tab === value;
        return (
          <Button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            variant="outline"
            size="sm"
            selected={selected}
            role="tab"
            aria-selected={selected}
            className="flex-1 lg:flex-none text-xs md:text-sm h-8 px-2 md:px-3 whitespace-nowrap"
          >
            {t(
              tab === "active"
                ? "reports.tabs.active"
                : "reports.tabs.archived",
              tab === "active" ? "Active" : "Archived"
            )}
          </Button>
        );
      })}
    </div>
  );
}
