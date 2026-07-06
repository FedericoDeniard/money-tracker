import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useTourStatus } from "../../hooks/useTour";
import { Button } from "../ui/Button";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { NotificationPreferencesChecklist } from "../notifications/NotificationPreferencesChecklist";
import { PushNotificationToggle } from "../notifications/PushNotificationToggle";
import { APP_VERSION, BUILD_TIMESTAMP } from "../../lib/version";
import { TagSelector } from "../tags/TagSelector";
import {
  BookOpen,
  CreditCard,
  Info,
  RotateCcw,
  SkipForward,
  Tag as TagIcon,
} from "lucide-react";

// settings page is broken into a thin orchestrator (`Settings` in
// pages/Settings.tsx) and the per-section components below. each
// section component pulls its own data and renders the same
// `border-t pt-6` layout as the original inline JSX, so the visual
// structure is preserved 1:1.

function SectionShell({
  titleKey,
  children,
  tourAttr,
}: {
  titleKey: string;
  children: React.ReactNode;
  tourAttr?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      data-tour={tourAttr}
      className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6"
    >
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
        {t(titleKey)}
      </h2>
      {children}
    </div>
  );
}

export function AccountBillingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <SectionShell
      titleKey="settings.accountBilling"
      tourAttr="settings-billing"
    >
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
              <CreditCard size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t("settings.accountBillingTitle")}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {t("settings.accountBillingDescription")}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<CreditCard size={16} />}
            onClick={() => navigate("/account/billing")}
          >
            {t("settings.accountBillingAction")}
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

export function LanguageSection() {
  const { t } = useTranslation();
  return (
    <SectionShell titleKey="settings.language" tourAttr="settings-language">
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("settings.selectLanguage")}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t("settings.languageDescription")}
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </SectionShell>
  );
}

export function NotificationsSection() {
  const { t } = useTranslation();
  return (
    <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
        {t("notifications.settings.title")}
      </h2>
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-6">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("notifications.settings.description")}
        </p>
        <div data-tour="settings-push-notification">
          <PushNotificationToggle />
        </div>
        <div data-tour="settings-notifications">
          <NotificationPreferencesChecklist />
        </div>
      </div>
    </div>
  );
}

export function TutorialSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSkippedAll, completedCount, totalCount, skipAll, resetAll } =
    useTourStatus();
  return (
    <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-1">
        {t("tour.panel.title")}
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        {t("tour.panel.description")}
      </p>
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen
              size={16}
              className="text-[var(--text-secondary)] shrink-0"
            />
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
      </div>
    </div>
  );
}

export function AccountInfoSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
        {t("settings.accountInfo")}
      </h2>
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-medium">{t("auth.email")}:</span> {user?.email}
        </p>
      </div>
    </div>
  );
}

export function AppVersionSection() {
  const { t } = useTranslation();
  const buildDate = BUILD_TIMESTAMP
    ? new Date(BUILD_TIMESTAMP).toLocaleString("en-US")
    : null;
  return (
    <div className="border-t border-[var(--text-secondary)]/30 mt-8 pt-6">
      <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
        {t("settings.about")}
      </h2>
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info size={16} className="text-[var(--text-secondary)] shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-[var(--text-primary)]">
              <span className="font-medium">{t("settings.version")}:</span>{" "}
              {APP_VERSION}
            </p>
            {buildDate && (
              <p className="text-xs text-[var(--text-secondary)]">
                {t("settings.buildDate")}: {buildDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TagsSection() {
  const { t } = useTranslation();
  return (
    <SectionShell titleKey="settings.tags" tourAttr="settings-tags">
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
            <TagIcon size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("settings.tagsTitle")}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t("settings.tagsDescription")}
            </p>
          </div>
        </div>
        <TagSelector mode="manage" />
      </div>
    </SectionShell>
  );
}
