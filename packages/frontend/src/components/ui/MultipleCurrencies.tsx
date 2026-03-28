import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface MultipleCurrenciesProps {
  currencies: string[];
  height?: string;
}

export function MultipleCurrencies({
  currencies,
  height = "h-64",
}: MultipleCurrenciesProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`${height} flex items-center justify-center text-[var(--text-secondary)]`}
    >
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-sm font-medium mb-2">
          {t("metrics.multipleCurrencies")}
        </p>
        <p className="text-xs mb-3">{t("metrics.cannotCompare")}</p>
        <div className="flex flex-wrap justify-center gap-1">
          {currencies.slice(0, 8).map(currency => (
            <span
              key={currency}
              className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded-full border border-[var(--border)]"
            >
              {currency}
            </span>
          ))}
          {currencies.length > 8 && (
            <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded-full border border-[var(--border)]">
              +{currencies.length - 8}
            </span>
          )}
        </div>
        <p className="text-xs mt-3 text-[var(--text-secondary)]">
          {t("metrics.selectSpecificCurrency")}
        </p>
      </div>
    </div>
  );
}
