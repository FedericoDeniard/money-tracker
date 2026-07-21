import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserIdCopyProps {
  userId: string;
  /** Compact mode for inline use in tables (no card, smaller text). */
  compact?: boolean;
  className?: string;
}

/**
 * Renders a UUID with a copy-to-clipboard button next to it. Used on
 * the admin Users list (compact) and UserDetail (full card) so the
 * operator can grab the value to paste into the UsageLimits lookup.
 */
export function UserIdCopy({ userId, compact, className }: UserIdCopyProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("clipboard write failed", err);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={userId}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
          className
        )}
      >
        <span>{compactUuid(userId)}</span>
        {copied ? (
          <Check size={10} aria-hidden="true" className="text-emerald-600" />
        ) : (
          <Copy size={10} aria-hidden="true" />
        )}
        <span className="sr-only">{t("common.copy")}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4",
        className
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        {t("admin.userDetail.userId")}
      </span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-[var(--bg-secondary)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
          {userId}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--text-secondary)]/20 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          {copied ? (
            <>
              <Check
                size={12}
                aria-hidden="true"
                className="text-emerald-600"
              />
              <span>{t("common.copied")}</span>
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              <span>{t("common.copy")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Truncated UUID for compact display (8 + "…" + 4). */
function compactUuid(uuid: string): string {
  if (uuid.length <= 13) return uuid;
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`;
}
