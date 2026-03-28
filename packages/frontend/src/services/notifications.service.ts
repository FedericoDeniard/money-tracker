import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../types/database.types";

export type NotificationRow = Tables<"notifications">;
export type NotificationImportance =
  Database["public"]["Enums"]["notification_importance"];
export type NotificationTypeRow = Tables<"notification_types">;
export type NotificationCategoryRow = Tables<"notification_categories">;
export type UserNotificationPreferenceRow =
  Tables<"user_notification_preferences">;

type NotificationJoinRow = NotificationRow & {
  notification_types:
    | (NotificationTypeRow & {
        notification_categories: NotificationCategoryRow | null;
      })
    | null;
};

type NotificationTypeJoinRow = NotificationTypeRow & {
  notification_categories: NotificationCategoryRow | null;
};

export interface NotificationItem extends NotificationRow {
  typeKey?: string;
  typeLabelI18nKey?: string;
  categoryKey?: string;
}

export interface NotificationListFilters {
  unread?: boolean;
  archived?: boolean;
  muted?: boolean;
  importance?: NotificationImportance;
  limit?: number;
}

export interface NotificationTypePreference {
  type: NotificationTypeRow;
  category: NotificationCategoryRow | null;
  preference: UserNotificationPreferenceRow | null;
}

function mapNotificationRow(row: NotificationJoinRow): NotificationItem {
  return {
    ...row,
    typeKey: row.notification_types?.key,
    typeLabelI18nKey: row.notification_types?.label_i18n_key,
    categoryKey: row.notification_types?.notification_categories?.key,
  };
}

export class NotificationsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listNotifications(
    filters: NotificationListFilters = {}
  ): Promise<NotificationItem[]> {
    const limit = filters.limit ?? 50;

    let query = this.supabase
      .from("notifications")
      .select(
        `
          *,
          notification_types (
            *,
            notification_categories (*)
          )
        `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.unread) {
      query = query.is("read_at", null);
    }
    if (typeof filters.archived === "boolean") {
      query = query.eq("is_archived", filters.archived);
    }
    if (typeof filters.muted === "boolean") {
      query = query.eq("is_muted", filters.muted);
    }
    if (filters.importance) {
      query = query.eq("importance", filters.importance);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (
      (data as NotificationJoinRow[] | null)?.map(mapNotificationRow) ?? []
    );
  }

  async getUnreadCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("is_archived", false);

    if (error) throw error;
    return count ?? 0;
  }

  async markAsRead(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
  }

  async markAsUnread(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.supabase
      .from("notifications")
      .update({ read_at: null })
      .in("id", ids);
    if (error) throw error;
  }

  async archive(ids: string[]): Promise<void> {
    await this.bulkPatch(ids, { is_archived: true });
  }

  async unarchive(ids: string[]): Promise<void> {
    await this.bulkPatch(ids, { is_archived: false });
  }

  async mute(ids: string[]): Promise<void> {
    await this.bulkPatch(ids, { is_muted: true });
  }

  async unmute(ids: string[]): Promise<void> {
    await this.bulkPatch(ids, { is_muted: false });
  }

  async setImportance(
    ids: string[],
    importance: NotificationImportance
  ): Promise<void> {
    await this.bulkPatch(ids, { importance });
  }

  async delete(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.supabase
      .from("notifications")
      .delete()
      .in("id", ids);
    if (error) throw error;
  }

  private async bulkPatch(
    ids: string[],
    patch: TablesUpdate<"notifications">
  ): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.supabase
      .from("notifications")
      .update(patch)
      .in("id", ids);
    if (error) throw error;
  }

  async listTypePreferences(): Promise<NotificationTypePreference[]> {
    const { data: types, error: typesError } = await this.supabase
      .from("notification_types")
      .select(
        `
          *,
          notification_categories (*)
        `
      )
      .eq("is_active", true)
      .order("key", { ascending: true });

    if (typesError) throw typesError;

    const { data: preferences, error: prefError } = await this.supabase
      .from("user_notification_preferences")
      .select("*");

    if (prefError) throw prefError;

    const preferenceByTypeId = new Map(
      (preferences ?? []).map(pref => [pref.notification_type_id, pref])
    );

    return ((types as NotificationTypeJoinRow[] | null) ?? []).map(typeRow => ({
      type: typeRow,
      category: typeRow.notification_categories ?? null,
      preference: preferenceByTypeId.get(typeRow.id) ?? null,
    }));
  }

  async upsertTypePreference(input: {
    notification_type_id: string;
    is_enabled?: boolean;
    is_muted?: boolean;
    muted_until?: string | null;
  }): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await this.supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");

    const payload: TablesInsert<"user_notification_preferences"> = {
      user_id: user.id,
      notification_type_id: input.notification_type_id,
      is_enabled: input.is_enabled ?? true,
      is_muted: input.is_muted ?? false,
      muted_until: input.muted_until ?? null,
    };

    const { error } = await this.supabase
      .from("user_notification_preferences")
      .upsert(payload, { onConflict: "user_id,notification_type_id" });

    if (error) throw error;
  }

  async createNotification(input: {
    user_id: string;
    notification_type_id: string;
    title_i18n_key: string;
    body_i18n_key: string;
    i18n_params?: Json;
    metadata?: Json;
    action_path?: string | null;
    icon_key?: string | null;
    avatar_url?: string | null;
    dedupe_key?: string | null;
    importance?: NotificationImportance;
  }): Promise<void> {
    const payload: TablesInsert<"notifications"> = {
      user_id: input.user_id,
      notification_type_id: input.notification_type_id,
      title_i18n_key: input.title_i18n_key,
      body_i18n_key: input.body_i18n_key,
      i18n_params: input.i18n_params ?? {},
      metadata: input.metadata ?? {},
      action_path: input.action_path ?? null,
      icon_key: input.icon_key ?? null,
      avatar_url: input.avatar_url ?? null,
      dedupe_key: input.dedupe_key ?? null,
      importance: input.importance ?? "normal",
    };

    const { error } = await this.supabase.from("notifications").insert(payload);
    if (error) throw error;
  }
}

export function createNotificationsService(supabase: SupabaseClient<Database>) {
  return new NotificationsService(supabase);
}
