/**
 * One row of the usage panel.
 *
 * Renders one of two layouts depending on the row kind:
 *   - normal (limit enforced): capability label, `used / limit`,
 *     progress bar with colour bucketed by `getUsageRowStatus`, reset
 *     date, and either an Upgrade link (free user at limit) or an
 *     At-limit badge (paid user at limit).
 *   - unlimited (admin role bypass): capability label, infinity glyph,
 *     neutral progress bar, and a "Admin bypass" caption. The Upgrade
 *     / At-limit CTAs don't apply.
 *
 * The tooltip on the scope label uses the Radix-based
 * `components/ui/shadcn/tooltip.tsx`. The colour thresholds map to
 * CSS vars defined in `index.css` (`--success`, `--warning`,
 * `--error`).
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/shadcn/tooltip";
import { Button } from "../ui/Button";
import { resolveScopeLabel } from "../../lib/usage-display";
import { getUsageRowStatus } from "../../utils/usage";
import type { UsageRow } from "../../services/usage.service";

interface UsageRowCardProps {
  row: UsageRow;
  hasActivePlan: boolean;
}

const STATUS_BAR_CLASS = {
  ok: "bg-[var(--success)]",
  warn: "bg-[var(--warning)]",
  exceeded: "bg-[var(--error)]",
} as const;

export function UsageRowCard({ row, hasActivePlan }: UsageRowCardProps) {
  const { t, i18n } = useTranslation();
  const labelKey = `settings.usage.capabilities.${row.capability}.label`;
  const label = t(labelKey, {
    defaultValue: row.capability.replace(/_/g, " "),
  });

  return (
    <div
      className="flex flex-col gap-2 rounded-xl bg-[var(--bg-secondary)] p-4"
      data-capability={row.capability}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calculator
            size={16}
            className="shrink-0 text-[var(--text-secondary)]"
            aria-hidden
          />
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {label}
          </span>
          <ScopeTooltip row={row} />
        </div>
        {row.unlimited ? <UnlimitedBadge /> : <UsageCount row={row} />}
      </div>

      {row.unlimited ? (
        <UnlimitedBody />
      ) : (
        <TrackedBody
          row={row}
          hasActivePlan={hasActivePlan}
          t={t}
          i18n={i18n}
        />
      )}
    </div>
  );
}

/** Tiny presentational sub-components kept in this file for locality. */

function ScopeTooltip({ row }: { row: UsageRow }) {
  const { t } = useTranslation();
  // Unlimited rows skip the resolver, so the resolved scope is "default"
  // with no value. Show a fixed "admin bypass" copy instead of the
  // usual role/plan/default label so the user understands why.
  const label =
    row.unlimited && row.scopeValue === null && row.scopeKind === "default"
      ? t("settings.usage.scope.adminBypass")
      : resolveScopeLabel(row.scopeKind, row.scopeValue, t);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline-offset-2 hover:underline cursor-help"
            aria-label={t("settings.usage.scopeAriaLabel")}
          >
            ({label})
          </button>
        </TooltipTrigger>
        <TooltipContent>{t("settings.usage.scopeTooltip")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UnlimitedBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="text-base font-mono tabular-nums text-[var(--text-primary)]"
      aria-label={t("settings.usage.unlimitedAria")}
    >
      ∞
    </span>
  );
}

function UsageCount({ row }: { row: UsageRow }) {
  const { t } = useTranslation();
  return (
    <span
      className="text-xs font-mono tabular-nums text-[var(--text-secondary)]"
      aria-label={t("settings.usage.ariaLabelProgress", {
        used: row.used,
        limit: row.limit,
      })}
    >
      {row.used} / {row.limit}
    </span>
  );
}

function UnlimitedBody() {
  const { t } = useTranslation();
  return (
    <>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={0}
        aria-label={t("settings.usage.unlimitedAria")}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--text-secondary)]/15"
      >
        <div className="h-full w-full bg-transparent" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-secondary)]">
          {t("settings.usage.scope.adminBypass")}
        </span>
      </div>
    </>
  );
}

interface TrackedBodyProps {
  row: UsageRow;
  hasActivePlan: boolean;
  t: ReturnType<typeof useTranslation>["t"];
  i18n: ReturnType<typeof useTranslation>["i18n"];
}

function TrackedBody({ row, hasActivePlan, t, i18n }: TrackedBodyProps) {
  const status = getUsageRowStatus(row.used, row.limit);
  // Cap visual width at 100% so an over-limit row doesn't overflow
  // the container; we still render the `used / limit` text and the
  // exceeded status separately.
  const pct = Math.min(
    100,
    Math.round((row.used / Math.max(row.limit, 1)) * 100)
  );
  const resetDate = formatResetDateLocalized(row.resetsAt, i18n.language);
  const atLimit = status === "exceeded";

  return (
    <>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={row.limit}
        aria-valuenow={Math.min(row.used, row.limit)}
        aria-valuetext={t("settings.usage.ariaValueText", {
          used: row.used,
          limit: row.limit,
          percent: pct,
        })}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--text-secondary)]/15"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${STATUS_BAR_CLASS[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-secondary)]">
          {t("settings.usage.resetsOn", { date: resetDate })}
        </span>
        {!row.unlimited && atLimit && !hasActivePlan ? (
          <Link to="/account/billing">
            <Button variant="primary" size="sm" icon={<Calculator size={14} />}>
              {t("settings.usage.upgrade")}
            </Button>
          </Link>
        ) : !row.unlimited && atLimit ? (
          <span className="rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-xs font-medium text-[var(--error)]">
            {t("settings.usage.atLimit")}
          </span>
        ) : null}
      </div>
    </>
  );
}

function formatResetDateLocalized(iso: string, locale: string): string {
  const d = new Date(iso);
  // We pass the locale so users in es-AR see "31/07/2026" instead of
  // "07/31/2026". Falls back to en-US if the locale is unsupported.
  return d.toLocaleDateString(locale || "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
