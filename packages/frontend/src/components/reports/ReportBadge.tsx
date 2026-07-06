import { FileText } from "lucide-react";
import { cn } from "../../lib/utils";

interface ReportBadgeProps {
  title: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Plain-text report indicator. No background, no border — just a muted
 * FileText icon + the report title. Renders next to category/merchant
 * info and intentionally doesn't compete visually with category or
 * tag colors on the card.
 */
export function ReportBadge({
  title,
  size = "sm",
  className,
}: ReportBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        "text-[var(--text-secondary)]",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
      title={title}
    >
      <FileText
        size={size === "sm" ? 10 : 12}
        className="shrink-0 opacity-60"
      />
      <span className="truncate max-w-[12rem]">{title}</span>
    </span>
  );
}
