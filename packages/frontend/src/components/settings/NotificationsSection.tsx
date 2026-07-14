import { useTranslation } from "react-i18next";
import { NotificationPreferencesChecklist } from "../notifications/NotificationPreferencesChecklist";
import { PushNotificationToggle } from "../notifications/PushNotificationToggle";
import { SettingsCategoryCard } from "./SettingsCategoryCard";

export function NotificationsSection() {
  const { t } = useTranslation();
  return (
    <SettingsCategoryCard
      id="notifications"
      titleKey="settingsLayout.nav.notifications"
      descriptionKey="settingsLayout.categoryDescription.notifications"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("notifications.settings.description")}
        </p>
        <div data-tour="settings-push-notification">
          <PushNotificationToggle />
        </div>
        <div data-tour="settings-notifications">
          <NotificationPreferencesChecklist />
        </div>
      </div>
    </SettingsCategoryCard>
  );
}
