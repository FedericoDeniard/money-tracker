import {
  PieChart,
  ArrowRightLeft,
  CalendarClock,
  BarChart3,
  SlidersHorizontal,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { DecorativeSquare } from "../ui/DecorativeSquare";
import { Button } from "../ui/Button";
import { LazyMotion, m, domAnimation, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import logo from "../../logo.svg";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const links = [
    { icon: PieChart, label: t("navigation.dashboard"), path: "/dashboard" },
    {
      icon: ArrowRightLeft,
      label: t("navigation.transactions"),
      path: "/transactions",
    },
    {
      icon: CalendarClock,
      label: t("navigation.subscriptions"),
      path: "/subscriptions",
    },
    { icon: BarChart3, label: t("navigation.metrics"), path: "/metrics" },
    ...(process.env.NODE_ENV !== "production"
      ? [
          {
            icon: MessageSquare,
            label: t("navigation.assistant"),
            path: "/assistant" as const,
          },
        ]
      : []),
    {
      icon: SlidersHorizontal,
      label: t("navigation.settings"),
      path: "/settings",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--text-secondary)]/20">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative size-10 flex items-center justify-center shrink-0">
            <DecorativeSquare size={40} className="absolute inset-0 m-auto" />
            <img
              src={logo}
              alt="Money Tracker Logo"
              className="relative z-10 w-full h-full p-1.5 object-contain"
            />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Money Tracker
          </h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map(link => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out group ${
                isActive
                  ? "text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isActive && (
                <m.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[var(--primary)] rounded-lg shadow-md"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative flex items-center gap-3 z-10">
                <link.icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
                <span className="font-medium">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--text-secondary)]/20 mt-auto">
        <Button
          variant="ghost"
          icon={<LogOut size={20} />}
          iconPosition="left"
          onClick={signOut}
          className="w-full justify-start"
        >
          {t("navigation.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <LazyMotion features={domAnimation}>
      {/* Desktop Sidebar */}
      <aside
        data-tour="sidebar"
        className="hidden lg:flex w-64 min-h-screen flex-col fixed left-0 top-0 h-full z-10"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-zinc-950 z-40 lg:hidden"
            />
            <m.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-[var(--bg-primary)] z-50 lg:hidden shadow-xl"
            >
              {sidebarContent}
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
