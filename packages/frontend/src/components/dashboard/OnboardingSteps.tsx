import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, FileUp, Mail, ReceiptText } from "lucide-react";

interface OnboardingStepsProps {
  onUpload: () => void;
  onAddManually: () => void;
}

export function OnboardingSteps({
  onUpload,
  onAddManually,
}: OnboardingStepsProps) {
  const { t } = useTranslation();

  const steps = [
    {
      key: "step1",
      icon: Mail,
      cta: (
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--button-primary)] hover:underline"
        >
          {t("common.open")}
          <ArrowRight size={14} />
        </Link>
      ),
      onClick: undefined as (() => void) | undefined,
    },
    {
      key: "step2",
      icon: FileUp,
      cta: (
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--button-primary)] hover:underline"
        >
          {t("common.open")}
          <ArrowRight size={14} />
        </button>
      ),
      onClick: undefined,
    },
    {
      key: "step3",
      icon: ReceiptText,
      cta: (
        <button
          type="button"
          onClick={onAddManually}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--button-primary)] hover:underline"
        >
          {t("common.open")}
          <ArrowRight size={14} />
        </button>
      ),
      onClick: undefined,
    },
  ];

  return (
    <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {t("dashboardOverview.onboarding.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("dashboardOverview.onboarding.subtitle")}
        </p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className="rounded-xl border border-[var(--text-secondary)]/15 bg-[var(--bg-secondary)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-[var(--text-secondary)]">
                    <Icon size={14} />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {t(`dashboardOverview.onboarding.${step.key}.title`)}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {t(`dashboardOverview.onboarding.${step.key}.description`)}
                  </p>
                  <div className="mt-3">{step.cta}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
