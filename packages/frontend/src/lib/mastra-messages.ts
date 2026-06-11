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

  return toAISdkMessages(dbMessages, { version: "v6" }) as UIMessage[];
}
