import {
  Settings,
  Receipt,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { DecorativeSquare } from "../ui/DecorativeSquare";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";
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
    { icon: LayoutDashboard, label: t("navigation.dashboard"), path: "/" },
    { icon: Receipt, label: t("navigation.transactions"), path: "/emails" },
    { icon: TrendingUp, label: t("navigation.metrics"), path: "/metrics" },
    { icon: Settings, label: t("navigation.settings"), path: "/settings" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--text-secondary)]/20">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <DecorativeSquare size={40} className="absolute" />
            <img
              src={logo}
              alt="Money Tracker Logo"
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Money Tracker
          </h1>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            icon={<X size={24} />}
          />
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
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
                <motion.div
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
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen flex-col fixed left-0 top-0 h-full z-10">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-[var(--bg-primary)] z-50 lg:hidden shadow-xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
