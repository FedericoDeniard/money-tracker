import { useTranslation } from "react-i18next";
import { SettingsLayout } from "../components/settings/SettingsLayout";
import { SettingsCategoryCard } from "../components/settings/SettingsCategoryCard";
import { AccountSection } from "../components/settings/AccountSection";
import { UsageSection } from "../components/settings/UsageSection";
import { ProfileSection } from "../components/settings/ProfileSection";
import { ConnectionsSection } from "../components/settings/ConnectionsSection";
import { NotificationsSection } from "../components/settings/NotificationsSection";
import { PreferencesSection } from "../components/settings/PreferencesSection";
import { AboutSection } from "../components/settings/AboutSection";

const CATEGORIES = [
  { id: "account", titleKey: "settingsLayout.nav.account" },
  { id: "usage", titleKey: "settingsLayout.nav.usage" },
  { id: "profile", titleKey: "settingsLayout.nav.profile" },
  { id: "connections", titleKey: "settingsLayout.nav.connections" },
  { id: "notifications", titleKey: "settingsLayout.nav.notifications" },
  { id: "preferences", titleKey: "settingsLayout.nav.preferences" },
  { id: "about", titleKey: "settingsLayout.nav.about" },
];

export function Settings() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
      <SettingsCategoryCard
        id="settings-header"
        titleKey="settings.title"
        descriptionKey="settings.pageDescription"
      >
        <p className="sr-only">{t("settings.title")}</p>
      </SettingsCategoryCard>

      <SettingsLayout categories={CATEGORIES}>
        <AccountSection />
        <UsageSection />
        <ProfileSection />
        <ConnectionsSection />
        <NotificationsSection />
        <PreferencesSection />
        <AboutSection />
      </SettingsLayout>
    </div>
  );
}
