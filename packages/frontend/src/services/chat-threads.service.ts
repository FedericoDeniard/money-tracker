import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export interface ChatThread {
  id: string;
  resourceId: string;
  title: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  /** Mastra stores content as JSON (MastraMessageContentV2): { format: 2, parts: [...], content: "..." } */
  content: unknown;
  role: "user" | "assistant" | "system" | "tool";
  type: string | null;
  createdAt: string;
  resourceId: string | null;
}

/** Helper to extract plain text from a MastraDBMessage content field */
function extractMessageText(content: unknown): string {
  // Try to parse JSON string (content is stored as text column, not jsonb)
  let parsed = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      // Not JSON, use the raw string as text
      return content;
    }
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    // MastraMessageContentV2 has a "content" fallback with plain text
    if (typeof obj.content === "string") return obj.content;
    // Extract text from parts array
    if (Array.isArray(obj.parts)) {
      return obj.parts
        .filter(
          (p: unknown): p is { type: string; text: string } =>
            typeof p === "object" &&
            p !== null &&
            (p as Record<string, unknown>).type === "text"
        )
        .map(p => p.text)
        .join("");
    }
  }
  return "";
}

/**
 * Returns true when the Supabase error is expected (table missing, JWT
 * issues, etc.) and we should silently return an empty result instead of
 * crashing the UI. Mastra's tables don't exist until the server has been
 * run at least once, so this is normal during local development.
 */
function isExpectedMissingTableError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  if (error.code === "PGRST301") return true; // JWT issue
  if (error.code === "PGRST116") return true; // row not found
  if (error.code === "42P01") return true; // undefined_table
  if (error.message?.includes("does not exist")) return true;
  return false;
}

class ChatThreadsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listThreads(): Promise<ChatThread[]> {
    // RLS filters by resourceId = auth.uid()::text automatically.
    // Cast to our local type because Mastra tables aren't in database.types yet.
    const { data, error } = await this.supabase
      .schema("ai")
      .from("mastra_threads" as never)
      .select("*")
      .order('"updatedAt"', { ascending: false })
      .limit(50);

    if (error) {
      if (isExpectedMissingTableError(error)) {
        // Silently return empty — Mastra tables don't exist yet
        return [];
      }
      throw error;
    }
    return (data as unknown as ChatThread[]) ?? [];
  }

  async listMessages(threadId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .schema("ai")
      .from("mastra_messages" as never)
      .select("*")
      .eq("thread_id", threadId)
      .order('"createdAt"', { ascending: true });

    if (error) {
      if (isExpectedMissingTableError(error)) {
        return [];
      }
      throw error;
    }
    return (data as unknown as ChatMessage[]) ?? [];
  }

  async deleteThread(threadId: string): Promise<void> {
    const { error } = await this.supabase
      .schema("ai")
      .from("mastra_threads" as never)
      .delete()
      .eq("id", threadId);
    if (error) {
      if (isExpectedMissingTableError(error)) {
        return;
      }
      throw error;
    }
  }
}

export function createChatThreadsService(supabase: SupabaseClient<Database>) {
  return new ChatThreadsService(supabase);
}
