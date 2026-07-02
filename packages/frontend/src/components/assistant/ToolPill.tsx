import { useTranslation } from "react-i18next";
import {
  CalculatorIcon,
  CheckIcon,
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

const ACTIVE_STATES = new Set<ToolPart["state"]>([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

interface ToolPillProps {
  part: ToolPart;
}

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
  const rawName = getRawName(part);
  const i18nKey = getI18nToolKey(rawName);

  const displayName = t(
    `assistant.tools.${i18nKey}`,
    formatFallbackName(rawName)
  );

  const isActive = ACTIVE_STATES.has(part.state);
  const isError =
    part.state === "output-error" || part.state === "output-denied";

  const ToolIcon = getToolIcon(rawName);
  const StateIcon = isActive ? Loader2Icon : isError ? XIcon : CheckIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs leading-none",
        isError ? "text-rose-600" : "text-stone-500"
      )}
    >
      <ToolIcon className="size-3 shrink-0" />
      <span>{displayName}</span>
      <StateIcon
        className={cn(
          "ml-1 size-3 shrink-0",
          isActive && "animate-spin",
          !isError && !isActive && "text-emerald-600"
        )}
      />
    </span>
  );
}
