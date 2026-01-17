import React from "react";
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  useRegisterActions,
} from "kbar";
import type { Action } from "kbar";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function KBarInner() {
  const { results } = useMatches();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const currentLanguage = i18n.language;
  const nextLanguage = currentLanguage === "es" ? "en" : "es";
  const nextLanguageName = nextLanguage === "es" ? "Español" : "English";

  // Base actions that are always available
  const baseActions: Action[] = [
    {
      id: "language",
      name: `${t('settings.language')} (${nextLanguageName})`,
      shortcut: ["l"],
      keywords: "language idioma english español",
      section: t('kbar.navigation'),
      perform: () => {
        i18n.changeLanguage(nextLanguage);
      },
    },
  ];

  // Actions for non-authenticated users
  const guestActions: Action[] = [
    {
      id: "login",
      name: t('auth.signIn'),
      shortcut: ["i"],
      keywords: "login entrar ingresar sesion",
      section: t('kbar.quickActions'),
      perform: () => navigate("/login"),
    },
    {
      id: "register",
      name: t('auth.signUp'),
      shortcut: ["r"],
      keywords: "registro registrarse crear cuenta",
      section: t('kbar.quickActions'),
      perform: () => navigate("/register"),
    },
  ];

  // Actions for authenticated users
  const authActions: Action[] = [
    {
      id: "dashboard",
      name: t('navigation.dashboard'),
      shortcut: ["d"],
      keywords: t('kbar.keywords.dashboard'),
      section: t('kbar.navigation'),
      perform: () => navigate("/"),
    },
    {
      id: "transactions",
      name: t('navigation.transactions'),
      shortcut: ["t"],
      keywords: t('kbar.keywords.transactions'),
      section: t('kbar.navigation'),
      perform: () => navigate("/emails"),
    },
    {
      id: "settings",
      name: t('navigation.settings'),
      shortcut: ["c"],
      keywords: t('kbar.keywords.settings'),
      section: t('kbar.navigation'),
      perform: () => navigate("/settings"),
    },
    {
      id: "logout",
      name: t('navigation.logout'),
      shortcut: ["s"],
      keywords: "salir cerrar sesion logout",
      section: t('kbar.account'),
      perform: async () => {
        await signOut();
      },
    },
  ];

  // Combine actions based on auth state
  const actions = user 
    ? [...baseActions, ...authActions]
    : [...baseActions, ...guestActions];

  useRegisterActions(actions, [t, i18n.language, nextLanguageName, user]);

  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-lg mx-4 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
          <KBarSearch
            className="w-full h-12 px-4 text-sm bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 outline-none placeholder:text-gray-600 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
            placeholder={t('kbar.placeholder')}
          />
          <KBarResults
            items={results}
            onRender={({ item, active }) =>
              typeof item === "string" ? (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {item}
                </div>
              ) : (
                <div
                  className={`px-4 py-3 text-sm cursor-pointer flex items-center gap-3 transition-colors ${
                    active
                      ? "bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <span className="text-lg">
                    {item.id === "dashboard"
                      ? "📊"
                      : item.id === "transactions"
                        ? "💰"
                        : item.id === "settings"
                          ? "⚙️"
                        : item.id === "language"
                          ? "🌐"
                        : item.id === "login"
                          ? "🔑"
                        : item.id === "register"
                          ? "👤"
                        : item.id === "logout"
                          ? "⚡"
                          : "📄"}
                  </span>
                  <div className="flex-1">{item.name}</div>
                  {item.shortcut && (
                    <div className="flex gap-1">
                      {item.shortcut.map((key, index) => (
                        <kbd
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
          />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

export default function KBar() {
  return (
    <KBarProvider>
      <KBarInner />
    </KBarProvider>
  );
}
