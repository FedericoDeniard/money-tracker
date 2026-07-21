import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  authorized: "bg-emerald-100 text-emerald-700",
  pending: "bg-blue-100 text-blue-700",
  processing: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  pending_cancellation: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-zinc-100 text-zinc-700",
  failed: "bg-red-100 text-red-700",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const value = status ?? "unknown";
  const style = STATUS_STYLES[value] ?? "bg-zinc-100 text-zinc-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {value}
    </span>
  );
}
