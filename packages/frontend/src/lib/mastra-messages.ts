import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import type { UIMessage } from "ai";
import type { ChatMessage } from "../services/chat-threads.service";

function parseMastraContent(content: unknown): unknown {
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
  return content;
}

const APPROVAL_ID_SEPARATOR = "::";

type PendingApproval = {
  toolCallId: string;
  toolName: string;
  args: unknown;
  type: "approval";
  runId: string;
  resumeSchema?: string;
};

type DataToolCallApprovalPart = {
  type: "data-tool-call-approval";
  id?: string;
  data?: PendingApproval;
};

/**
 * Extracts `pendingToolApprovals` from a Mastra message's parts and metadata.
 * Mastra persists approval requests in two places: as `data-tool-call-approval`
 * data parts inside `parts`, and inside the message `metadata.pendingToolApprovals`.
 * Both carry the same data; we prefer the data part (canonical UI form) and fall
 * back to the metadata bag.
 */
function collectPendingApprovals(message: {
  parts?: unknown[];
  metadata?: { pendingToolApprovals?: Record<string, PendingApproval> } | null;
}): PendingApproval[] {
  const out: PendingApproval[] = [];
  const seen = new Set<string>();

  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (!part || typeof part !== "object") continue;
      const p = part as Partial<DataToolCallApprovalPart>;
      if (p.type !== "data-tool-call-approval") continue;
      const data = p.data;
      if (!data || typeof data !== "object") continue;
      if (
        typeof data.toolCallId !== "string" ||
        typeof data.toolName !== "string"
      )
        continue;
      if (typeof data.runId !== "string") continue;
      if (seen.has(data.toolCallId)) continue;
      seen.add(data.toolCallId);
      out.push(data);
    }
  }

  const meta = message.metadata?.pendingToolApprovals;
  if (meta && typeof meta === "object") {
    for (const approval of Object.values(meta)) {
      if (!approval || typeof approval !== "object") continue;
      if (
        typeof approval.toolCallId !== "string" ||
        typeof approval.toolName !== "string"
      )
        continue;
      if (typeof approval.runId !== "string") continue;
      if (seen.has(approval.toolCallId)) continue;
      seen.add(approval.toolCallId);
      out.push(approval);
    }
  }

  return out;
}

function approvalIdFor(runId: string, toolCallId: string): string {
  return `${runId}${APPROVAL_ID_SEPARATOR}${toolCallId}`;
}

/**
 * Mastra persists tool-approval requests as `data-tool-call-approval` data
 * parts (and as `pendingToolApprovals` in message metadata). The AI SDK v6
 * `useChat` hook — and our `CreateTransactionConfirmation` component built
 * around it — expects a tool part with `state: "approval-requested"` and an
 * `approval.id` of the form `${runId}::${toolCallId}`.
 *
 * This helper rewrites the messages in place: for each pending approval we
 * synthesise the matching tool part (if missing) and drop the data part.
 * Without this, reloading the page while an approval is pending would lose
 * the confirmation UI, because the data part alone does not satisfy
 * `MessageParts`' tool-part check.
 */
function hydrateApprovalToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    const approvals = collectPendingApprovals(
      message as unknown as {
        parts?: unknown[];
        metadata?: {
          pendingToolApprovals?: Record<string, PendingApproval>;
        } | null;
      }
    );
    if (approvals.length === 0) return message;

    const parts = Array.isArray(message.parts) ? [...message.parts] : [];
    const toolPartIndexByCallId = new Map<string, number>();
    parts.forEach((part, index) => {
      if (!part || typeof part !== "object") return;
      const p = part as { type?: string; toolCallId?: string };
      if (
        typeof p.type === "string" &&
        p.type.startsWith("tool-") &&
        typeof p.toolCallId === "string"
      ) {
        toolPartIndexByCallId.set(p.toolCallId, index);
      }
    });

    for (const approval of approvals) {
      const existingIndex = toolPartIndexByCallId.get(approval.toolCallId);
      const toolPart = {
        type: `tool-${approval.toolName}`,
        toolCallId: approval.toolCallId,
        state: "approval-requested" as const,
        input: approval.args,
        approval: { id: approvalIdFor(approval.runId, approval.toolCallId) },
      };

      if (existingIndex === undefined) {
        parts.push(toolPart);
      } else {
        parts[existingIndex] = {
          ...(parts[existingIndex] as Record<string, unknown>),
          ...toolPart,
        };
      }
    }

    const filtered = parts.filter(part => {
      if (!part || typeof part !== "object") return true;
      const p = part as { type?: string };
      return p.type !== "data-tool-call-approval";
    });

    return { ...message, parts: filtered };
  });
}

/**
 * When the user denies a tool, Mastra persists a tool result with the string
 * `"Tool call was not approved by the user"` and `state: "result"`. After
 * `toAISdkMessages` converts that to AI SDK v6 it lands as
 * `state: "output-available"` with the same string in `output` — not
 * `state: "output-denied"`. Our tool UIs key off the v6 states, so we rewrite
 * the part here to the correct denied state.
 *
 * The string is the canonical signal Mastra uses server-side when resuming an
 * agent run with `{ approved: false }` — see
 * `node_modules/@mastra/core/dist/chunk-*.js` (search "not approved"). Mastra
 * also streams the live denial as a `tool-result` with
 * `output: { type: "execution-denied", reason?: string }`; we cover that
 * shape too in case a future version persists it as-is.
 *
 * @see https://mastra.ai/guides/build-your-ui/ai-sdk-ui#loading-historical-messages
 */
const TOOL_DENIED_RESULT = "Tool call was not approved by the user";

function isExecutionDeniedOutput(output: unknown): boolean {
  if (typeof output === "string") {
    return output === TOOL_DENIED_RESULT;
  }
  if (output && typeof output === "object" && "type" in output) {
    return (output as { type: unknown }).type === "execution-denied";
  }
  return false;
}

function hydrateDeniedToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      return message;
    }
    let mutated = false;
    const parts = message.parts.map(part => {
      if (!part || typeof part !== "object") return part;
      const p = part as Record<string, unknown>;
      if (
        typeof p.type !== "string" ||
        !p.type.startsWith("tool-") ||
        p.state !== "output-available" ||
        typeof p.toolCallId !== "string" ||
        !isExecutionDeniedOutput(p.output)
      ) {
        return part;
      }
      mutated = true;
      const {
        output: _output,
        resultProviderMetadata: _rpm,
        result: _result,
        ...rest
      } = p;
      return {
        ...rest,
        type: p.type,
        toolCallId: p.toolCallId,
        state: "output-denied",
        approval: { id: p.toolCallId, approved: false },
      };
    });
    return mutated ? { ...message, parts } : message;
  });
}

/**
 * Maps Supabase mastra_messages rows to MastraDBMessage shape, then converts
 * to AI SDK v6 UIMessage[] via the official Mastra utility.
 *
 * @see https://mastra.ai/guides/build-your-ui/ai-sdk-ui#loading-historical-messages
 */
export function chatMessagesToUIMessages(rows: ChatMessage[]): UIMessage[] {
  const dbMessages = rows
    .filter(
      (m): m is ChatMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant"
    )
    .map(row => ({
      id: row.id,
      role: row.role,
      createdAt: new Date(row.createdAt),
      threadId: row.thread_id,
      resourceId: row.resourceId ?? undefined,
      type: row.type ?? undefined,
      content: parseMastraContent(row.content),
    }));

  const converted = toAISdkMessages(dbMessages, {
    version: "v6",
  }) as UIMessage[];
  const denied = hydrateDeniedToolParts(converted);
  return hydrateApprovalToolParts(denied);
}
