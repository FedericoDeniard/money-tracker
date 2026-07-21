import type { AppRole } from "../../services/admin.service";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<AppRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  tester: "bg-blue-100 text-blue-700",
  user: "bg-zinc-100 text-zinc-700",
};

interface RoleBadgeProps {
  role: AppRole | null;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const value = role ?? "user";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_STYLES[value],
        className
      )}
    >
      {value}
    </span>
  );
}
