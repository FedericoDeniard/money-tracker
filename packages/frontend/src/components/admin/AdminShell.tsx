import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  CalendarClock,
  CreditCard,
  Sprout,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: React.ReactNode;
}

const TABS: Array<{
  to: string;
  icon: typeof Users;
  labelKey: string;
  end?: boolean;
}> = [
  { to: "/admin", icon: BarChart3, labelKey: "admin.tabs.overview", end: true },
  { to: "/admin/users", icon: Users, labelKey: "admin.tabs.users" },
  {
    to: "/admin/subscriptions",
    icon: CalendarClock,
    labelKey: "admin.tabs.subscriptions",
  },
  { to: "/admin/payments", icon: CreditCard, labelKey: "admin.tabs.payments" },
  { to: "/admin/seeds", icon: Sprout, labelKey: "admin.tabs.seeds" },
  {
    to: "/admin/usage-limits",
    icon: BarChart3,
    labelKey: "admin.tabs.usageLimits",
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t("admin.title")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("admin.subtitle")}
        </p>
      </header>

      <nav
        aria-label={t("admin.title")}
        className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-1"
      >
        {TABS.map(tab => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname === tab.to ||
              location.pathname.startsWith(`${tab.to}/`);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end ?? false}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <tab.icon size={16} />
              {t(tab.labelKey)}
            </NavLink>
          );
        })}
      </nav>

      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
