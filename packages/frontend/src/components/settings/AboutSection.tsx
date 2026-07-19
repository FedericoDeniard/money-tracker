import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Info, RotateCcw, SkipForward } from "lucide-react";
import { useTourStatus } from "../../hooks/useTour";
import { Button } from "../ui/Button";
import { APP_VERSION, BUILD_TIMESTAMP } from "../../lib/version";
import { SettingsCategoryCard } from "./SettingsCategoryCard";

function TutorialsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSkippedAll, completedCount, totalCount, skipAll, resetAll } =
    useTourStatus();
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-[var(--text-secondary)] shrink-0" />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {t("tour.panel.title")}
        </p>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isSkippedAll
              ? "bg-zinc-100 text-zinc-500"
              : completedCount === totalCount
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {isSkippedAll
            ? t("tour.panel.allSkipped")
            : t("tour.panel.completedCount", {
                count: completedCount,
                total: totalCount,
              })}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        {t("tour.panel.description")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw size={15} />}
          onClick={() => {
            resetAll();
            navigate("/dashboard");
          }}
        >
          {t("tour.panel.restartButton")}
        </Button>
        {!isSkippedAll && (
          <Button
            variant="ghost"
            size="sm"
            icon={<SkipForward size={15} />}
            onClick={skipAll}
          >
            {t("tour.panel.skipButton")}
          </Button>
        )}
      </div>
    </div>
  );
}

function AppVersionCard() {
  const { t, i18n } = useTranslation();
  const buildDate = BUILD_TIMESTAMP
    ? new Date(BUILD_TIMESTAMP).toLocaleString(i18n.language || "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-3">
        <Info size={16} className="text-[var(--text-secondary)] shrink-0" />
        <div className="space-y-1 flex-1">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-medium">{t("settings.version")}:</span>{" "}
            {APP_VERSION}
          </p>
          {buildDate && (
            <p className="text-xs text-[var(--text-secondary)]">
              {t("settings.buildDate")}: {buildDate}
            </p>
          )}
          <Link
            to="/privacy"
            className="inline-block text-xs font-medium text-[var(--button-primary)] hover:underline pt-1"
          >
            {t("settings.privacy")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AboutSection() {
  return (
    <SettingsCategoryCard
      id="about"
      titleKey="settingsLayout.nav.about"
      descriptionKey="settingsLayout.categoryDescription.about"
    >
      <div className="space-y-4">
        <TutorialsCard />
        <AppVersionCard />
      </div>
    </SettingsCategoryCard>
  );
}
