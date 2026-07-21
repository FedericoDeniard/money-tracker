import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: "up" | "down" | "flat";
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-[var(--text-secondary)]">{hint}</span>
      ) : null}
    </div>
  );
}
