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
  label: string;
}

const STATE_CONFIG: Record<ToolPart["state"], StateConfig> = {
  "input-streaming": {
    iconBg: "bg-amber-300",
    badgeBg: "bg-amber-200",
    icon: ClockIcon,
    label: "Pending",
  },
  "input-available": {
    iconBg: "bg-sky-300",
    badgeBg: "bg-sky-200",
    icon: Loader2Icon,
    label: "Running",
  },
  "output-available": {
    iconBg: "bg-emerald-300",
    badgeBg: "bg-emerald-200",
    icon: CheckIcon,
    label: "Done",
  },
  "output-error": {
    iconBg: "bg-rose-300",
    badgeBg: "bg-rose-200",
    icon: AlertCircleIcon,
    label: "Error",
  },
  "output-denied": {
    iconBg: "bg-orange-300",
    badgeBg: "bg-orange-200",
    icon: XIcon,
    label: "Denied",
  },
  "approval-requested": {
    iconBg: "bg-yellow-300",
    badgeBg: "bg-yellow-200",
    icon: HandIcon,
    label: "Awaiting",
  },
  "approval-responded": {
    iconBg: "bg-violet-300",
    badgeBg: "bg-violet-200",
    icon: CheckIcon,
    label: "Responded",
  },
};

function getToolIcon(
  name: string
): React.ComponentType<{ className?: string }> {
  const lower = name.toLowerCase();
  if (lower.includes("list") || lower.includes("transaction"))
    return ListChecksIcon;
  if (lower.includes("calc") || lower.includes("math")) return CalculatorIcon;
  return WrenchIcon;
}

function getToolDisplayName(part: ToolPart): string {
  if (part.type === "dynamic-tool" && part.toolName) {
    return part.toolName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, c => c.toUpperCase())
      .trim();
  }
  const raw = part.type.split("-").slice(1).join(" ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function ToolPill({ part }: ToolPillProps) {
  const config = STATE_CONFIG[part.state];
  const displayName = getToolDisplayName(part);
  const ToolIcon = getToolIcon(displayName);
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
        {config.label}
      </div>
    </div>
  );
}
