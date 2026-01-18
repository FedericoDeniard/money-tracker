import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const languages = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const nextLanguage = i18n.language === "es" ? "en" : "es";
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      title={currentLanguage?.name || "Language"}
    >
      <Globe size={16} />
      <span className="hidden sm:inline">{currentLanguage?.flag || "🌐"}</span>
      <span className="hidden md:inline">
        {currentLanguage?.name || "Language"}
      </span>
    </button>
  );
}

export default LanguageSwitcher;
