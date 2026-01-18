import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { useTranslation } from "react-i18next";

export function Home() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t("navigation.dashboard")}
          </h1>
          <Button variant="danger" onClick={signOut}>
            {t("navigation.logout")}
          </Button>
        </div>

        <div className="border-t border-[var(--text-secondary)]/30 pt-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("dashboard.welcome")}
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">{t("auth.email")}:</span>{" "}
              {user?.email}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              <span className="font-medium">{t("common.userId")}:</span>{" "}
              {user?.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
