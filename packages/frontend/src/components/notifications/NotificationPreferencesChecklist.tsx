import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "../../hooks/useNotificationPreferences";

export function NotificationPreferencesChecklist() {
  const { t } = useTranslation();
  const preferencesQuery = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        categoryLabel: string;
        rows: NonNullable<typeof preferencesQuery.data>;
      }
    >();

    for (const row of preferencesQuery.data ?? []) {
      const key = row.category?.key ?? "uncategorized";
      const categoryLabel = row.category
        ? t(row.category.label_i18n_key)
        : t("notifications.settings.uncategorized");
      if (!groups.has(key)) {
        groups.set(key, { categoryLabel, rows: [] });
      }
      groups.get(key)?.rows.push(row);
    }

    return Array.from(groups.values());
  }, [preferencesQuery.data, t]);

  if (preferencesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 size={16} className="animate-spin" />
        <span>{t("notifications.loading")}</span>
      </div>
    );
  }

  if (!preferencesQuery.data?.length) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        {t("notifications.settings.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div
          key={group.categoryLabel}
          className="rounded-lg border border-[var(--text-secondary)]/20 bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {group.categoryLabel}
          </h3>
          <div className="mt-3 space-y-3">
            {group.rows.map(({ type, preference }) => {
              const enabled = preference?.is_enabled ?? true;
              const muted = preference?.is_muted ?? false;
              const disabled = updatePreference.isPending;

              return (
                <div
                  key={type.id}
                  className="rounded-md border border-[var(--text-secondary)]/15 p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {t(type.label_i18n_key)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {t(type.description_i18n_key)}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={disabled}
                        onChange={(event) =>
                          updatePreference.mutate({
                            notification_type_id: type.id,
                            is_enabled: event.target.checked,
                            is_muted: muted,
                            muted_until: preference?.muted_until ?? null,
                          })
                        }
                      />
                      {t("notifications.settings.receive")}
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={muted}
                        disabled={disabled || !enabled}
                        onChange={(event) =>
                          updatePreference.mutate({
                            notification_type_id: type.id,
                            is_enabled: enabled,
                            is_muted: event.target.checked,
                            muted_until: null,
                          })
                        }
                      />
                      {t("notifications.settings.mute")}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
