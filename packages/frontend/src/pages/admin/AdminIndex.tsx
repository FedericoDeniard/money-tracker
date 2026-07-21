import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminShell } from "../../components/admin/AdminShell";
import { StatCard } from "../../components/admin/StatCard";
import { useAdminStats } from "../../hooks/useAdminStats";
import { formatDateSafe } from "../../utils/format";
import {
  Users,
  CalendarClock,
  CreditCard,
  Sprout,
  BarChart3,
  Shield,
} from "lucide-react";

export function AdminIndex() {
  const { t, i18n } = useTranslation();
  const statsQuery = useAdminStats();
  const stats = statsQuery.data;

  return (
    <AdminShell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.stats.mrr")}
          value={
            stats && stats.mrr.length > 0
              ? stats.mrr
                  .map(
                    m =>
                      `${m.currency} ${m.mrr_amount.toLocaleString()} (${m.subs})`
                  )
                  .join(" · ")
              : "—"
          }
          hint={t("admin.stats.mrrHint")}
        />
        <StatCard
          label={t("admin.stats.activeSubs")}
          value={stats?.active_subscriptions ?? "—"}
          hint={t("admin.stats.activeSubsHint")}
        />
        <StatCard
          label={t("admin.stats.churn30d")}
          value={stats ? `${stats.churn_30d_pct}%` : "—"}
          hint={
            stats
              ? t("admin.stats.churnHint", { count: stats.cancelled_30d })
              : undefined
          }
        />
        <StatCard
          label={t("admin.stats.generatedAt")}
          value={
            stats ? formatDateSafe(stats.generated_at, i18n.language) : "—"
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminShortcut
          to="/admin/users"
          icon={Users}
          label={t("admin.tabs.users")}
        />
        <AdminShortcut
          to="/admin/subscriptions"
          icon={CalendarClock}
          label={t("admin.tabs.subscriptions")}
        />
        <AdminShortcut
          to="/admin/payments"
          icon={CreditCard}
          label={t("admin.tabs.payments")}
        />
        <AdminShortcut
          to="/admin/seeds"
          icon={Sprout}
          label={t("admin.tabs.seeds")}
        />
        <AdminShortcut
          to="/admin/usage-limits"
          icon={BarChart3}
          label={t("admin.tabs.usageLimits")}
        />
        <AdminShortcut
          to="/admin"
          icon={Shield}
          label={t("admin.shortcut.refresh")}
        />
      </div>
    </AdminShell>
  );
}

function AdminShortcut({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 transition-colors hover:border-[var(--primary)] hover:bg-[var(--bg-secondary)]"
    >
      <Icon size={20} className="text-[var(--text-secondary)]" />
      <span className="font-medium text-[var(--text-primary)]">{label}</span>
    </Link>
  );
}
