import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Bell, Menu } from "lucide-react";
import { Button } from "../ui/Button";
import logo from "../../logo.svg";
import { DecorativeSquare } from "../ui/DecorativeSquare";
import { NotificationsPanel } from "../notifications/NotificationsPanel";
import {
  useNotificationsRealtime,
  useUnreadNotificationsCount,
} from "../../hooks/useNotifications";
import { useTranslation } from "react-i18next";
import { useTour } from "../../hooks/useTour";

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { t } = useTranslation();
  const unreadCountQuery = useUnreadNotificationsCount();
  useNotificationsRealtime();
  // Mount the per-route tour watcher — watches location internally
  useTour();

  const unreadCount = unreadCountQuery.data ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[var(--bg-primary)] border-b border-[var(--text-secondary)]/20 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <DecorativeSquare size={32} className="absolute inset-0 m-auto" />
            <img
              src={logo}
              alt="Money Tracker Logo"
              className="relative z-10 w-full h-full p-1 object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            Money Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="relative rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label={t("settings.notifications")}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <Button
            onClick={() => setIsSidebarOpen(true)}
            variant="ghost"
            size="sm"
            icon={<Menu size={24} />}
          />
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative flex-1 p-4 lg:p-8 lg:ml-64 min-h-[calc(100vh-64px)] lg:min-h-screen w-full overflow-x-hidden">
        <div className="fixed right-0 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
          <button
            type="button"
            data-tour="notification-bell"
            onClick={() => setIsNotificationsOpen(true)}
            className="group relative flex items-center rounded-l-xl border border-r-0 border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-3 text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--text-primary)]"
            aria-label={t("settings.notifications")}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -left-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
