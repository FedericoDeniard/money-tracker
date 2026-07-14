import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { Button } from "../ui/Button";
import { SettingsCategoryCard } from "./SettingsCategoryCard";

export function AccountSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <SettingsCategoryCard
      id="account"
      titleKey="settings.accountBilling"
      descriptionKey="settingsLayout.categoryDescription.account"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-secondary)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
            <CreditCard size={20} className="text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("settings.accountBillingTitle")}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
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
    </SettingsCategoryCard>
  );
}
