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
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--text-secondary)]/20 px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--button-primary)] hover:text-[var(--button-primary)]"
      >
        <History
          className={
            show ? "size-3.5 text-[var(--button-primary)]" : "size-3.5"
          }
        />
        <span>{t("assistant.history")}</span>
      </button>
    </TooltipProvider>
  );
}
