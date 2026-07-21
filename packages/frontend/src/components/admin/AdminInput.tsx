import type { InputHTMLAttributes } from "react";

/**
 * Search/input field used across the admin panel. Matches the rest of the
 * app's visual language (CSS vars from index.css) instead of the generic
 * shadcn `Input` — the shadcn variant pulls in `--input` tokens that
 * aren't defined here, so it renders with a flat default look.
 */
export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      className={`block w-full rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors focus:border-[var(--primary-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-focus)] ${
        className ?? ""
      }`}
      {...props}
    />
  );
}
