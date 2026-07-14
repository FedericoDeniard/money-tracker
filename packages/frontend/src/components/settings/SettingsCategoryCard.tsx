import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface SettingsCategoryCardProps {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  dataTour?: string;
  children: ReactNode;
}

export function SettingsCategoryCard({
  id,
  titleKey,
  descriptionKey,
  dataTour,
  children,
}: SettingsCategoryCardProps) {
  const { t } = useTranslation();
  return (
    <section
      id={id}
      data-tour={dataTour}
      className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 md:p-6 shadow-sm scroll-mt-32"
    >
      <header className="mb-4">
        <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
          {t(titleKey)}
        </h2>
        {descriptionKey && (
          <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
            {t(descriptionKey)}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
