import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types/database.types";
import type {
  Tag,
  TagInsert,
  TagUpdate,
  TransactionTagLite,
} from "../types/tags";
import { TAG_COLORS, type TagColor } from "../constants/tags";

type TagRow = Tables<"tags">;

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color as TagColor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTagColor(color: string): asserts color is TagColor {
  if (!TAG_COLORS.includes(color as TagColor)) {
    throw new Error(`Invalid tag color: ${color}`);
  }
}

class TagsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async listTags(): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to load tags: ${error.message}`);
    }

    return (data ?? []).map(mapTag);
  }

  async createTag(input: Omit<TagInsert, "user_id">): Promise<Tag> {
    assertTagColor(input.color);

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await this.supabase
      .from("tags")
      .insert({
        name: input.name.trim(),
        color: input.color,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create tag: ${error.message}`);
    }

    return mapTag(data);
  }

  async updateTag(
    id: string,
    updates: Omit<TagUpdate, "user_id">
  ): Promise<Tag> {
    if (updates.color !== undefined) {
      assertTagColor(updates.color);
    }

    const { data, error } = await this.supabase
      .from("tags")
      .update({
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update tag: ${error.message}`);
    }

    return mapTag(data);
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase.from("tags").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }

  async getTagsForTransaction(
    transactionId: string
  ): Promise<TransactionTagLite[]> {
    const { data, error } = await this.supabase
      .from("transaction_tags")
      .select("tags!inner (id, name, color)")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load transaction tags: ${error.message}`);
    }

    return (
      (data ?? []) as unknown as Array<{
        tags: { id: string; name: string; color: string };
      }>
    ).map(r => {
      assertTagColor(r.tags.color);
      return {
        id: r.tags.id,
        name: r.tags.name,
        color: r.tags.color as TagColor,
      };
    });
  }

  async getTagsForTransactions(
    transactionIds: string[]
  ): Promise<Record<string, TransactionTagLite[]>> {
    if (transactionIds.length === 0) return {};

    const { data, error } = await this.supabase
      .from("transaction_tags")
      .select("transaction_id, tags!inner (id, name, color)")
      .in("transaction_id", transactionIds)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to load transaction tags batch: ${error.message}`
      );
    }

    const out: Record<string, TransactionTagLite[]> = {};
    for (const id of transactionIds) out[id] = [];

    for (const row of (data ?? []) as unknown as Array<{
      transaction_id: string;
      tags: { id: string; name: string; color: string };
    }>) {
      assertTagColor(row.tags.color);
      const list = out[row.transaction_id] ?? (out[row.transaction_id] = []);
      list.push({
        id: row.tags.id,
        name: row.tags.name,
        color: row.tags.color as TagColor,
      });
    }

    return out;
  }

  async setTagsForTransaction(
    transactionId: string,
    tagIds: string[]
  ): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    const deduped = Array.from(new Set(tagIds));

    const { error: deleteError } = await this.supabase
      .from("transaction_tags")
      .delete()
      .eq("transaction_id", transactionId);

    if (deleteError) {
      throw new Error(
        `Failed to clear transaction tags: ${deleteError.message}`
      );
    }

    if (deduped.length === 0) return;

    const rows = deduped.map(tagId => ({
      transaction_id: transactionId,
      tag_id: tagId,
      user_id: user.id,
    }));

    const { error: insertError } = await this.supabase
      .from("transaction_tags")
      .insert(rows);

    if (insertError) {
      throw new Error(
        `Failed to assign transaction tags: ${insertError.message}`
      );
    }
  }
}

export function createTagsService(supabase: SupabaseClient<Database>) {
  return new TagsService(supabase);
}
