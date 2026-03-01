import { supabase } from "./lib/supabase.ts";

type NotificationImportance = "low" | "normal" | "high" | "critical";

interface CreateSystemNotificationInput {
  typeKey: string;
  userId: string;
  i18nParams?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actionPath?: string | null;
  iconKey?: string | null;
  avatarUrl?: string | null;
  importance?: NotificationImportance;
  dedupeKey?: string | null;
  dedupeWindowMinutes?: number;
}

interface CreateSystemNotificationResult {
  created: boolean;
  reason?: string;
}

interface NotificationTypeLookup {
  id: string;
  title_i18n_key: string;
  body_i18n_key: string;
  default_importance: NotificationImportance;
  is_active: boolean;
}

interface UserPreferenceLookup {
  is_enabled: boolean;
  is_muted: boolean;
  muted_until: string | null;
}

export async function createSystemNotification(
  input: CreateSystemNotificationInput,
): Promise<CreateSystemNotificationResult> {
  try {
    const { data: typeData, error: typeError } = await supabase
      .from("notification_types")
      .select("id,title_i18n_key,body_i18n_key,default_importance,is_active")
      .eq("key", input.typeKey)
      .maybeSingle<NotificationTypeLookup>();

    if (typeError || !typeData || !typeData.is_active) {
      return { created: false, reason: "type_not_available" };
    }

    const { data: preferenceData } = await supabase
      .from("user_notification_preferences")
      .select("is_enabled,is_muted,muted_until")
      .eq("user_id", input.userId)
      .eq("notification_type_id", typeData.id)
      .maybeSingle<UserPreferenceLookup>();

    const isEnabled = preferenceData?.is_enabled ?? true;
    const isMuted = preferenceData?.is_muted ?? false;
    const mutedUntil = preferenceData?.muted_until
      ? new Date(preferenceData.muted_until)
      : null;
    const hasMuteWindow = mutedUntil ? mutedUntil.getTime() > Date.now() : false;
    const mutedIndefinitely = isMuted && !mutedUntil;

    if (!isEnabled || mutedIndefinitely || hasMuteWindow) {
      return { created: false, reason: "skipped_by_preference" };
    }

    if (input.dedupeKey) {
      const cutoff = new Date(
        Date.now() - (input.dedupeWindowMinutes ?? 10) * 60 * 1000,
      ).toISOString();

      const { data: existingDuplicate } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("notification_type_id", typeData.id)
        .eq("dedupe_key", input.dedupeKey)
        .gte("created_at", cutoff)
        .maybeSingle();

      if (existingDuplicate) {
        return { created: false, reason: "skipped_by_dedupe" };
      }
    }

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: input.userId,
      notification_type_id: typeData.id,
      title_i18n_key: typeData.title_i18n_key,
      body_i18n_key: typeData.body_i18n_key,
      i18n_params: input.i18nParams ?? {},
      metadata: input.metadata ?? {},
      action_path: input.actionPath ?? null,
      icon_key: input.iconKey ?? null,
      avatar_url: input.avatarUrl ?? null,
      importance: input.importance ?? typeData.default_importance,
      dedupe_key: input.dedupeKey ?? null,
    });

    if (insertError) {
      console.error("Error creating notification", {
        error: insertError,
        typeKey: input.typeKey,
        userId: input.userId,
      });
      return { created: false, reason: "insert_error" };
    }

    return { created: true };
  } catch (error) {
    console.error("Unexpected notification creation error", {
      error,
      input,
    });
    return { created: false, reason: "unexpected_error" };
  }
}
