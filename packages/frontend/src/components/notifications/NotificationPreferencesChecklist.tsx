import { useMemo } from "react";
import { Loader2, Bell, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "../../hooks/useNotificationPreferences";

function Toggle({
  checked,
  disabled,
  onChange,
  icon: Icon,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--button-primary)]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--button-primary)]" : "bg-[var(--text-secondary)]/30"
      }`}
    >
      <span
        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {Icon && (
          <span
            className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${
              checked ? "opacity-100" : "opacity-0"
            }`}
          >
            <Icon size={10} className="text-[var(--button-primary)]" />
          </span>
        )}
      </span>
    </button>
  );
}

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
      <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
        <Loader2
          size={24}
          className="animate-spin text-[var(--button-primary)] mb-2"
        />
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
    <div className="space-y-6">
      {grouped.map(group => (
        <div key={group.categoryLabel}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {group.categoryLabel}
          </h3>
          <div className="overflow-hidden rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm">
            <div className="divide-y divide-[var(--text-secondary)]/10">
              {group.rows.map(({ type, preference }) => {
                const enabled = preference?.is_enabled ?? true;
                const muted = preference?.is_muted ?? false;
                const disabled = updatePreference.isPending;

                return (
                  <div
                    key={type.id}
                    className="p-4 transition-colors hover:bg-[var(--bg-secondary)]/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {t(type.label_i18n_key)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {t(type.description_i18n_key)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-6 pt-2 sm:pt-0">
                        {/* Recibir Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            {t("notifications.settings.receive")}
                          </span>
                          <Toggle
                            checked={enabled}
                            disabled={disabled}
                            icon={Bell}
                            onChange={checked =>
                              updatePreference.mutate({
                                notification_type_id: type.id,
                                is_enabled: checked,
                                is_muted: muted,
                                muted_until: preference?.muted_until ?? null,
                              })
                            }
                          />
                        </div>

                        {/* Silenciar Toggle (Only if enabled) */}
                        <div
                          className={`flex items-center gap-2 transition-opacity ${!enabled ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                        >
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            {t("notifications.settings.mute")}
                          </span>
                          <Toggle
                            checked={muted}
                            disabled={disabled || !enabled}
                            icon={VolumeX}
                            onChange={checked =>
                              updatePreference.mutate({
                                notification_type_id: type.id,
                                is_enabled: enabled,
                                is_muted: checked,
                                muted_until: null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
