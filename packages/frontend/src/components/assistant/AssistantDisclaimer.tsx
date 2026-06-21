import { useTranslation } from "react-i18next";

export function AssistantDisclaimer() {
  const { t } = useTranslation();
  return (
    <p className="shrink-0 text-center text-xs text-[var(--text-secondary)]">
      {t("assistant.disclaimer")}
    </p>
  );
}
