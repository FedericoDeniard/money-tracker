import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Native <select> styled to match the rest of the app. The shadcn
 * SelectTrigger uses Radix popper + a data-state machine that pulls
 * in --border / --ring tokens the project doesn't define, so it ends
 * up looking flat and out of place next to the buttons and cards. A
 * styled native <select> keeps the keyboard/accessibility semantics
 * and renders correctly across browsers.
 */
export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div
      className={`relative inline-flex items-center ${
        className ?? "w-full sm:w-48"
      }`}
    >
      <select
        data-slot="select"
        className="block w-full appearance-none rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-4 py-3 pr-10 text-sm font-medium text-[var(--text-primary)] transition-colors focus:border-[var(--primary-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-focus)]"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-[var(--text-secondary)]"
      />
    </div>
  );
}
