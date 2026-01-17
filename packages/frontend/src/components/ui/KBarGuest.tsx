import React from "react";
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
} from "kbar";
import type { Action } from "kbar";
import { useNavigate } from "react-router-dom";

function KBarContent() {
  const { results } = useMatches();

  return (
    <KBarPortal>
      <KBarPositioner className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-lg mx-4 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
          <KBarSearch
            className="w-full h-12 px-4 text-sm bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 outline-none placeholder:text-gray-600 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
            placeholder="Escribe un comando o busca..."
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
                  <span className="text-lg">🔑</span>
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

export default function KBarGuest() {
  const navigate = useNavigate();

  const actions: Action[] = [
    {
      id: "login",
      name: "Iniciar Sesión",
      shortcut: ["i"],
      keywords: "login entrar ingresar sesion",
      section: "Acciones Rápidas",
      perform: () => navigate("/login"),
    },
    {
      id: "register",
      name: "Registrarse",
      shortcut: ["r"],
      keywords: "registro registrarse crear cuenta",
      section: "Acciones Rápidas",
      perform: () => navigate("/register"),
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <KBarContent />
    </KBarProvider>
  );
}
