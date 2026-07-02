import type { UIMessage } from "ai";

import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import { MessageResponse } from "@/components/ai-elements/message";
import { ToolCallGroup } from "./ToolCallGroup";
import { CreateTransactionConfirmation } from "./CreateTransactionConfirmation";
import { DeleteTransactionConfirmation } from "./DeleteTransactionConfirmation";
import { UpdateTransactionConfirmation } from "./UpdateTransactionConfirmation";
import { type ReactNode } from "react";

type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` | "dynamic-tool" }
>;

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

/**
 * Tools that require user approval and render a dedicated confirmation
 * card. These must stay outside the ToolCallGroup collapsible so the
 * Approve/Reject buttons are always visible.
 */
const APPROVAL_TOOL_TYPES = new Set([
  "tool-createTransactionTool",
  "tool-deleteTransactionTool",
  "tool-updateTransactionTool",
]);

function isApprovalTool(
  part: UIMessage["parts"][number],
  hasApproval: boolean
): boolean {
  return hasApproval && APPROVAL_TOOL_TYPES.has(part.type);
}

function isRegularToolPart(
  part: UIMessage["parts"][number],
  hasApproval: boolean
): part is ToolPart {
  if (!isToolPart(part)) return false;
  if (isApprovalTool(part, hasApproval)) return false;
  return true;
}

export type MessagePartsProps = {
  parts: UIMessage["parts"];
  isUser: boolean;
  onApproveTool?: (id: string) => void;
  onRejectTool?: (id: string) => void;
};

export function MessageParts({
  parts,
  isUser,
  onApproveTool,
  onRejectTool,
}: MessagePartsProps) {
  const hasApproval = Boolean(onApproveTool && onRejectTool);
  const elements: ReactNode[] = [];
  let toolBuffer: ToolPart[] = [];
  let groupIndex = 0;

  const flushToolBuffer = () => {
    if (toolBuffer.length === 0) return;
    const buffered = toolBuffer;
    elements.push(
      <ToolCallGroup key={`tool-group-${groupIndex++}`} parts={buffered} />
    );
    toolBuffer = [];
  };

  for (const part of parts) {
    if (part.type === "text") {
      flushToolBuffer();
      elements.push(
        <MessageResponse key={`text-${elements.length}`}>
          {part.text}
        </MessageResponse>
      );
      continue;
    }

    if (part.type === "file" && isUser) {
      flushToolBuffer();
      elements.push(
        <Attachments
          key={`file-${part.url}`}
          variant="grid"
          className="mb-2 [button]:hidden"
        >
          <Attachment data={{ ...part, id: part.url } as never}>
            <AttachmentPreview />
          </Attachment>
        </Attachments>
      );
      continue;
    }

    if (isToolPart(part)) {
      if (part.errorText) {
        console.error(`[tool:${part.toolName ?? part.type}]`, part.errorText);
      }
      if (isRegularToolPart(part, hasApproval)) {
        toolBuffer.push(part);
        continue;
      }
      // Approval-required tools render their own confirmation card
      // outside the collapsible group.
      flushToolBuffer();
      if (part.type === "tool-deleteTransactionTool") {
        elements.push(
          <DeleteTransactionConfirmation
            key={`${part.type}-${part.toolCallId}`}
            part={
              part as unknown as Parameters<
                typeof DeleteTransactionConfirmation
              >[0]["part"]
            }
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        );
      } else if (part.type === "tool-updateTransactionTool") {
        elements.push(
          <UpdateTransactionConfirmation
            key={`${part.type}-${part.toolCallId}`}
            part={
              part as unknown as Parameters<
                typeof UpdateTransactionConfirmation
              >[0]["part"]
            }
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        );
      } else {
        elements.push(
          <CreateTransactionConfirmation
            key={`${part.type}-${part.toolCallId}`}
            part={
              part as unknown as Parameters<
                typeof CreateTransactionConfirmation
              >[0]["part"]
            }
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        );
      }
      continue;
    }

    // Render the guardrail tripwire (data-tripwire) emitted by input
    // processors (e.g. TopicGuardrailProcessor). The @mastra/ai-sdk
    // adapter converts the server-side `tripwire` chunk to a
    // `data-tripwire` data part; the AI SDK silently persists it
    // unless we render it explicitly. We display the `reason` as the
    // assistant's response so the user sees why their request was
    // blocked instead of an empty bubble.
    if (
      part.type === "data-tripwire" &&
      !isUser &&
      typeof (part as { data?: unknown }).data === "object" &&
      (part as { data?: unknown }).data !== null
    ) {
      const tripwireData = (
        part as { data: { reason?: string; processorId?: string } }
      ).data;
      const reason = tripwireData.reason;
      if (typeof reason === "string" && reason.trim().length > 0) {
        flushToolBuffer();
        elements.push(
          <MessageResponse key={`tripwire-${elements.length}`}>
            {reason}
          </MessageResponse>
        );
        continue;
      }
    }

    // Unknown or non-renderable part types (e.g. step-start, step-end)
    // must NOT flush the buffer — otherwise tools separated by these
    // metadata markers would be split into separate collapsible groups.
  }

  flushToolBuffer();

  return <>{elements}</>;
}
