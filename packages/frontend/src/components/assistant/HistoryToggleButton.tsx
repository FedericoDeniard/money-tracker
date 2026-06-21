import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { TooltipProvider } from "../ui/shadcn/tooltip";

interface HistoryToggleButtonProps {
  show: boolean;
  onToggle: () => void;
}

export function HistoryToggleButton({
  show,
  onToggle,
}: HistoryToggleButtonProps) {
  const { t } = useTranslation();
  return (
    <TooltipProvider delayDuration={0}>
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] ${show ? "bg-[var(--button-primary)]/10 text-[var(--button-primary)]" : "text-[var(--text-secondary)]"}`}
        aria-label={t("assistant.history")}
      >
        <History className="size-4" />
      </button>
    </TooltipProvider>
  );
}
