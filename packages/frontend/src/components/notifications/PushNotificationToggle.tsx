import { Bell, BellOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePushNotifications } from "../../hooks/usePushNotifications";

/**
 * A self-contained toggle card that lets the user enable or disable
 * push notifications for the current device/browser.
 *
 * - Shows a loading state while checking the current subscription
 * - Shows an "Enable" button if not subscribed
 * - Shows a "Disable" button if already subscribed
 * - Shows a "Blocked" message if the user denied permission
 * - Returns null if push is not supported in this browser
 */
export function PushNotificationToggle() {
  const { t } = useTranslation();
  const { isSupported, isLoading, bannerState, subscribe, unsubscribe } =
    usePushNotifications();

  // Don't render anything if push is not supported
  if (!isSupported) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-[var(--text-secondary)]">
        <Loader2 size={16} className="animate-spin" />
        <span>{t("notifications.push.checking")}</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("notifications.push.title")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {bannerState === "blocked"
                ? t("notifications.push.blocked_description")
                : t("notifications.push.description")}
            </p>
          </div>

          <div className="shrink-0">
            {bannerState === "blocked" && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                <BellOff size={16} />
                <span>{t("notifications.push.blocked_label")}</span>
              </div>
            )}

            {bannerState === "enable" && (
              <button
                type="button"
                disabled={subscribe.isPending}
                onClick={() => subscribe.mutate()}
                className="flex items-center gap-2 rounded-lg bg-[var(--button-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {subscribe.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Bell size={16} />
                )}
                {t("notifications.push.enable")}
              </button>
            )}

            {bannerState === "subscribed" && (
              <button
                type="button"
                disabled={unsubscribe.isPending}
                onClick={() => unsubscribe.mutate()}
                className="flex items-center gap-2 rounded-lg border border-[var(--text-secondary)]/30 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unsubscribe.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BellOff size={16} />
                )}
                {t("notifications.push.disable")}
              </button>
            )}
          </div>
        </div>

        {subscribe.isError && (
          <p className="mt-2 text-sm text-red-600">
            {subscribe.error instanceof Error
              ? subscribe.error.message
              : t("notifications.push.error")}
          </p>
        )}
      </div>
    </div>
  );
}
