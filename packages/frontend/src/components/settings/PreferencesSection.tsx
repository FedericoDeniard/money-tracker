import { useTranslation } from "react-i18next";
import { Tag as TagIcon } from "lucide-react";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { TagSelector } from "../tags/TagSelector";
import { SettingsCategoryCard } from "./SettingsCategoryCard";

function LanguageCard() {
  const { t } = useTranslation();
  return (
    <div
      data-tour="settings-language"
      className="p-4 rounded-xl bg-[var(--bg-secondary)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("settings.selectLanguage")}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t("settings.languageDescription")}
          </p>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

function TagsCard() {
  const { t } = useTranslation();
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
          <TagIcon size={20} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("settings.tagsTitle")}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t("settings.tagsDescription")}
          </p>
        </div>
      </div>
      <TagSelector mode="manage" />
    </div>
  );
}

export function PreferencesSection() {
  return (
    <SettingsCategoryCard
      id="preferences"
      titleKey="settingsLayout.nav.preferences"
      descriptionKey="settingsLayout.categoryDescription.preferences"
    >
      <div className="space-y-4">
        <LanguageCard />
        <TagsCard />
      </div>
    </SettingsCategoryCard>
  );
}
