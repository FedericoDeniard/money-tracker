import type { UIMessage } from "ai";

import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import { MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";

type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` | "dynamic-tool" }
>;

const TOOL_DEFAULT_OPEN_STATES: Record<ToolPart["state"], boolean> = {
  "input-streaming": false,
  "input-available": true,
  "output-available": true,
  "output-error": true,
  "approval-requested": false,
  "approval-responded": false,
  "output-denied": false,
};

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

export type MessagePartsProps = {
  parts: UIMessage["parts"];
  isUser: boolean;
};

export function MessageParts({ parts, isUser }: MessagePartsProps) {
  return (
    <>
      {parts.map(part => {
        if (part.type === "text") {
          return <MessageResponse key={part.text}>{part.text}</MessageResponse>;
        }

        if (part.type === "file" && isUser) {
          return (
            <Attachments
              key={part.url}
              variant="grid"
              className="mb-2 [button]:hidden"
            >
              <Attachment data={{ ...part, id: part.url } as never}>
                <AttachmentPreview />
              </Attachment>
            </Attachments>
          );
        }

        if (isToolPart(part)) {
          if (part.errorText) {
            console.error(
              `[tool:${part.toolName ?? part.type}]`,
              part.errorText
            );
          }
          return (
            <Tool
              key={`${part.type}-${part.toolCallId}`}
              defaultOpen={TOOL_DEFAULT_OPEN_STATES[part.state]}
              className="mb-2 w-fit rounded-lg border-0 bg-[var(--accent)] text-[var(--primary)]"
            >
              <ToolHeader
                type={part.type as never}
                state={part.state}
                toolName={
                  part.type === "dynamic-tool" ? part.toolName : undefined
                }
                className="p-2 [&>svg:last-child]:hidden [&_svg]:text-[var(--primary)]/70"
              />
            </Tool>
          );
        }

        return null;
      })}
    </>
  );
}
