import { useTranslation } from "react-i18next";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import type { UIMessage } from "ai";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/shadcn/collapsible";
import { ToolPill } from "./ToolPill";

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

type AggregateState = "active" | "done" | "error" | "denied";

function computeAggregateState(parts: ToolPart[]): AggregateState {
  const hasActive = parts.some(p => ACTIVE_STATES.has(p.state));
  if (hasActive) return "active";
  const hasError = parts.some(p => p.state === "output-error");
  if (hasError) return "error";
  const hasDenied = parts.some(p => p.state === "output-denied");
  if (hasDenied) return "denied";
  return "done";
}

interface AggregateStateConfig {
  icon: React.ComponentType<{ className?: string }>;
  fallbackLabel: string;
  badgeBg: string;
  iconColor: string;
}

const AGGREGATE_STATE_CONFIG: Record<AggregateState, AggregateStateConfig> = {
  active: {
    icon: Loader2Icon,
    fallbackLabel: "Running",
    badgeBg: "bg-sky-200",
    iconColor: "text-sky-700",
  },
  done: {
    icon: CheckIcon,
    fallbackLabel: "Done",
    badgeBg: "bg-emerald-200",
    iconColor: "text-emerald-700",
  },
  error: {
    icon: AlertCircleIcon,
    fallbackLabel: "Error",
    badgeBg: "bg-rose-200",
    iconColor: "text-rose-700",
  },
  denied: {
    icon: XIcon,
    fallbackLabel: "Denied",
    badgeBg: "bg-orange-200",
    iconColor: "text-orange-700",
  },
};

interface ToolCallGroupProps {
  parts: ToolPart[];
}

export function ToolCallGroup({ parts }: ToolCallGroupProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const aggregateState = computeAggregateState(parts);

  // Auto-expand while any tool is still active, auto-collapse when all
  // tools reach a final state. The user can still toggle manually after
  // the auto-collapse; we only react to state transitions, not to user
  // clicks (Radix keeps the user-controlled value between renders).
  const [prevAggregateState, setPrevAggregateState] = useState(aggregateState);
  if (aggregateState !== prevAggregateState) {
    setPrevAggregateState(aggregateState);
    setOpen(aggregateState === "active");
  }

  const config = AGGREGATE_STATE_CONFIG[aggregateState];
  const StateIcon = config.icon;
  const stateLabel = t(
    `assistant.toolGroup.aggregateState.${aggregateState}`,
    config.fallbackLabel
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-2">
      <CollapsibleTrigger
        className={cn(
          "flex w-fit max-w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-2.5 py-1.5",
          "text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}
      >
        <WrenchIcon className="size-3.5 shrink-0" />
        <span>
          {t("assistant.toolGroup.toolsUsed", {
            count: parts.length,
            defaultValue: `${parts.length} tool${parts.length === 1 ? "" : "s"} used`,
          })}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full border border-border/30 px-2 py-0.5 font-bold leading-none",
            config.badgeBg,
            config.iconColor
          )}
        >
          <StateIcon
            className={cn(
              "size-3",
              aggregateState === "active" && "animate-spin"
            )}
          />
          {stateLabel}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:hidden">
        <div className="flex flex-col gap-0.5 pt-1">
          {parts.map(part => (
            <ToolPill key={`${part.type}-${part.toolCallId}`} part={part} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
