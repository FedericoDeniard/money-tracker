/**
 * Display-time configuration for the usage panel.
 *
 * `USAGE_DISPLAY_ORDER` is hand-rolled (not derived from the enum)
 * because the visual order is a product decision, not a technical
 * one. The order below roughly tracks: "things you used this month"
 * → "things related to a subscription" → "free-tier conveniences".
 * When a new capability is added, the developer adds it in the
 * right position here explicitly.
 *
 * `resolveScopeLabel` maps a stored scope (`role:tester`,
 * `plan:lite_monthly`, `default`) to a localized label via
 * `t()`. Unknown prefixes get the raw scope as the fallback so the
 * panel never shows an empty tooltip if a new prefix ships in the
 * DB before we add a translation.
 */
import { usageWarn } from "./usage-logger";
import type { Translator } from "../utils/edge-function-errors";
import type { Capability } from "./capabilities";

export const USAGE_DISPLAY_ORDER: readonly Capability[] = [
  "ai_assistant",
  "process_documents",
  "report_pdf_export",
  "gmail_sync",
  "push_notifications",
  "advanced_reports",
] as const;

/**
 * Sort `rows` by `USAGE_DISPLAY_ORDER`. Capabilities not in the
 * display list (drift case) are appended at the end so the panel
 * still renders them.
 */
export function sortByDisplayOrder<T extends { capability: Capability }>(
  rows: T[]
): T[] {
  const order = new Map<Capability, number>();
  USAGE_DISPLAY_ORDER.forEach((cap, idx) => order.set(cap, idx));
  return [...rows].sort((a, b) => {
    const ai = order.get(a.capability) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b.capability) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

/**
 * Human-readable label for a stored scope. Returns the raw scope
 * (with a `[usage]` warning) for prefixes the frontend doesn't know
 * about, so the tooltip stays informative without crashing.
 */
export function resolveScopeLabel(scope: string, t: Translator): string {
  if (scope === "default") return t("settings.usage.scope.default");
  if (scope.startsWith("role:")) {
    const role = scope.slice("role:".length);
    return t("settings.usage.scope.roleTest", { role });
  }
  if (scope.startsWith("plan:")) {
    const planKey = scope.slice("plan:".length);
    return t("settings.usage.scope.plan", { planKey });
  }
  usageWarn("unhandled scope prefix in tooltip", { scope });
  return scope;
}
