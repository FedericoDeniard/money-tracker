import type { UIMessage } from "ai";

import {
  Attachment,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import { MessageResponse } from "@/components/ai-elements/message";
import { ToolPill } from "./ToolPill";

type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` | "dynamic-tool" }
>;

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
            <ToolPill key={`${part.type}-${part.toolCallId}`} part={part} />
          );
        }

        return null;
      })}
    </>
  );
}
