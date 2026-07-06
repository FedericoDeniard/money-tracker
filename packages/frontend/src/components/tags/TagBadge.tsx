import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES, type TagColor } from "../../constants/tags";

export interface TagBadgeProps {
  name: string;
  color: TagColor;
  size?: "sm" | "md";
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({
  name,
  color,
  size = "sm",
  onRemove,
  className,
}: TagBadgeProps) {
  const palette = TAG_COLOR_CLASSES[color];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        palette.bg,
        palette.fg,
        palette.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full shrink-0",
          palette.fg.replace("text-", "bg-")
        )}
      />
      <span className="truncate max-w-[10rem]">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "shrink-0 rounded-full p-0.5 hover:bg-black/10 transition-colors",
            palette.fg
          )}
          aria-label={`Remove tag ${name}`}
        >
          <X size={size === "sm" ? 10 : 12} />
        </button>
      )}
    </span>
  );
}
