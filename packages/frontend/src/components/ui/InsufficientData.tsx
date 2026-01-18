import { useTranslation } from "react-i18next";

interface InsufficientDataProps {
  title?: string;
  message?: string;
  height?: string;
}

export function InsufficientData({ 
  title, 
  message, 
  height = "h-64" 
}: InsufficientDataProps) {
  const { t } = useTranslation();

  const defaultTitle = title || t("metrics.insufficientData");
  const defaultMessage = message || t("metrics.needMoreMonths");

  return (
    <div className={`${height} flex items-center justify-center text-[var(--text-secondary)]`}>
      <div className="text-center">
        <p className="text-sm font-medium mb-2">{defaultTitle}</p>
        <p className="text-xs">{defaultMessage}</p>
      </div>
    </div>
  );
}
