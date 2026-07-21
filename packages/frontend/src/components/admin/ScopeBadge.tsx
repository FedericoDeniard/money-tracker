import type { Database } from "../../types/database.types";
import { cn } from "@/lib/utils";

type ScopeKind = Database["payments"]["Enums"]["usage_scope_kind"];

const SCOPE_STYLES: Record<ScopeKind, string> = {
  role: "bg-blue-100 text-blue-700",
  plan: "bg-emerald-100 text-emerald-700",
  default: "bg-zinc-100 text-zinc-700",
  team: "bg-amber-100 text-amber-700",
  org: "bg-amber-100 text-amber-700",
};

interface ScopeBadgeProps {
  scope: ScopeKind;
  value: string | null;
  className?: string;
}

export function ScopeBadge({ scope, value, className }: ScopeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        SCOPE_STYLES[scope],
        className
      )}
    >
      {scope}
      {value ? <span className="opacity-75">: {value}</span> : null}
    </span>
  );
}
