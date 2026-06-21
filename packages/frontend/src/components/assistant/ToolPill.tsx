import { useTranslation } from "react-i18next";
import {
  AlertCircleIcon,
  CalculatorIcon,
  CheckIcon,
  ClockIcon,
  HandIcon,
  ListChecksIcon,
  Loader2Icon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` | "dynamic-tool" }
>;

interface ToolPillProps {
  part: ToolPart;
}

interface StateConfig {
  iconBg: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
  /** English fallback for the state label when the i18n key is missing. */
  fallbackLabel: string;
}

const STATE_CONFIG: Record<ToolPart["state"], StateConfig> = {
  "input-streaming": {
    iconBg: "bg-amber-300",
    badgeBg: "bg-amber-200",
    icon: ClockIcon,
    fallbackLabel: "Pending",
  },
  "input-available": {
    iconBg: "bg-sky-300",
    badgeBg: "bg-sky-200",
    icon: Loader2Icon,
    fallbackLabel: "Running",
  },
  "output-available": {
    iconBg: "bg-emerald-300",
    badgeBg: "bg-emerald-200",
    icon: CheckIcon,
    fallbackLabel: "Done",
  },
  "output-error": {
    iconBg: "bg-rose-300",
    badgeBg: "bg-rose-200",
    icon: AlertCircleIcon,
    fallbackLabel: "Error",
  },
  "output-denied": {
    iconBg: "bg-orange-300",
    badgeBg: "bg-orange-200",
    icon: XIcon,
    fallbackLabel: "Denied",
  },
  "approval-requested": {
    iconBg: "bg-yellow-300",
    badgeBg: "bg-yellow-200",
    icon: HandIcon,
    fallbackLabel: "Awaiting",
  },
  "approval-responded": {
    iconBg: "bg-violet-300",
    badgeBg: "bg-violet-200",
    icon: CheckIcon,
    fallbackLabel: "Responded",
  },
};

function getToolIcon(
  rawName: string
): React.ComponentType<{ className?: string }> {
  const lower = rawName.toLowerCase();
  if (lower.includes("list") || lower.includes("transaction"))
    return ListChecksIcon;
  if (lower.includes("calc") || lower.includes("math")) return CalculatorIcon;
  return WrenchIcon;
}

function getRawName(part: ToolPart): string {
  if (part.type === "dynamic-tool" && part.toolName) return part.toolName;
  return part.type.split("-").slice(1).join("-");
}

function getI18nToolKey(rawName: string): string {
  return rawName.replace(/Tool$/, "");
}

function formatFallbackName(rawName: string): string {
  return rawName
    .replace(/Tool$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

export function ToolPill({ part }: ToolPillProps) {
  const { t } = useTranslation();
  const config = STATE_CONFIG[part.state];
  const rawName = getRawName(part);
  const i18nKey = getI18nToolKey(rawName);

  const displayName = t(
    `assistant.tools.${i18nKey}`,
    formatFallbackName(rawName)
  );
  const stateLabel = t(
    `assistant.toolStates.${part.state}`,
    config.fallbackLabel
  );

  const ToolIcon = getToolIcon(rawName);
  const StateIcon = config.icon;

  return (
    <div
      className={cn(
        "flex w-fit max-w-full items-center gap-2 my-2 px-2.5 py-1.5",
        "rounded-2xl border border-[var(--text-secondary)]/20 bg-stone-50"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center size-7 rounded-full border border-[var(--text-secondary)]/20 shrink-0",
          config.iconBg
        )}
      >
        <ToolIcon className="size-4 text-stone-900" />
      </div>
      <span className="font-black text-sm leading-none text-stone-900">
        {displayName}
      </span>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--text-secondary)]/20 text-xs font-bold leading-none text-stone-900",
          config.badgeBg
        )}
      >
        <StateIcon className="size-3" />
        {stateLabel}
      </div>
    </div>
  );
}
