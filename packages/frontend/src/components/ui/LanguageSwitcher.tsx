import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "./Button";

const languages = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage =
    languages.find(lang => lang.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const nextLanguage = i18n.language === "es" ? "en" : "es";
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="ghost"
      size="sm"
      icon={<Globe size={16} />}
      iconPosition="right"
      className="flex items-center gap-2"
      title={currentLanguage?.name || "Language"}
    >
      <span>{currentLanguage?.flag || "🌐"}</span>
      <span>{currentLanguage?.name || "Language"}</span>
    </Button>
  );
}

export default LanguageSwitcher;
