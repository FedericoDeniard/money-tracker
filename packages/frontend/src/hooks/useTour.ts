import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { driver } from "driver.js";
import type { Driver, DriveStep } from "driver.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_ALL_KEY = "money_tracker_tour_skip_all";

const TOUR_ROUTES = [
  "/dashboard",
  "/transactions",
  "/subscriptions",
  "/metrics",
  "/settings",
] as const;

type TourRoute = (typeof TOUR_ROUTES)[number];

const DONE_KEYS: Record<TourRoute, string> = {
  "/dashboard": "money_tracker_tour_done_dashboard",
  "/transactions": "money_tracker_tour_done_transactions",
  "/subscriptions": "money_tracker_tour_done_subscriptions",
  "/metrics": "money_tracker_tour_done_metrics",
  "/settings": "money_tracker_tour_done_settings",
};

// ─── Module-level session tracking ───────────────────────────────────────────
// Prevents re-triggering the same route's tour multiple times per session.
// Persists across re-renders; resets on page reload (fresh module evaluation).

const triggeredThisSession = new Set<string>();

// ─── Storage helpers ──────────────────────────────────────────────────────────

function checkSkipAll(): boolean {
  return localStorage.getItem(SKIP_ALL_KEY) === "true";
}

function checkDone(route: TourRoute): boolean {
  return localStorage.getItem(DONE_KEYS[route]) === "true";
}

function isTourRoute(path: string): path is TourRoute {
  return (TOUR_ROUTES as readonly string[]).includes(path);
}

// ─── Public reset utility ─────────────────────────────────────────────────────
// Exported so useTourStatus (and Settings page) can call it.
// Also clears the session tracker so tours re-trigger on the next navigation.

export function resetAllTours() {
  localStorage.removeItem(SKIP_ALL_KEY);
  TOUR_ROUTES.forEach(r => localStorage.removeItem(DONE_KEYS[r]));
  triggeredThisSession.clear();
}

// ─── Step builders ────────────────────────────────────────────────────────────

function buildStepsForRoute(
  route: TourRoute,
  t: (key: string) => string
): DriveStep[] {
  const pushSupported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  switch (route) {
    case "/dashboard":
      return [
        {
          popover: {
            title: t("tour.dashboard.step1.title"),
            description: t("tour.dashboard.step1.description"),
            align: "center",
          },
        },
        {
          element: "[data-tour='notification-bell']",
          popover: {
            title: t("tour.dashboard.step2.title"),
            description: t("tour.dashboard.step2.description"),
            side: "left",
            align: "center",
          },
        },
        {
          element: "[data-tour='quick-actions']",
          popover: {
            title: t("tour.dashboard.step3.title"),
            description: t("tour.dashboard.step3.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-tour='dashboard-status']",
          popover: {
            title: t("tour.dashboard.step4.title"),
            description: t("tour.dashboard.step4.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "[data-tour='sidebar']",
          popover: {
            title: t("tour.dashboard.step5.title"),
            description: t("tour.dashboard.step5.description"),
            side: "right",
            align: "center",
          },
        },
      ];

    case "/transactions":
      return [
        {
          element: "[data-tour='transaction-filters']",
          popover: {
            title: t("tour.transactions.step1.title"),
            description: t("tour.transactions.step1.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-tour='transaction-content']",
          popover: {
            title: t("tour.transactions.step2.title"),
            description: t("tour.transactions.step2.description"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "[data-tour='transaction-fab']",
          popover: {
            title: t("tour.transactions.step3.title"),
            description: t("tour.transactions.step3.description"),
            side: "top",
            align: "end",
          },
        },
      ];

    case "/subscriptions":
      return [
        {
          element: "[data-tour='subscriptions-header']",
          popover: {
            title: t("tour.subscriptions.step1.title"),
            description: t("tour.subscriptions.step1.description"),
            side: "bottom",
            align: "start",
          },
        },
      ];

    case "/metrics":
      return [
        {
          element: "[data-tour='metrics-header']",
          popover: {
            title: t("tour.metrics.step1.title"),
            description: t("tour.metrics.step1.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-tour='metrics-content']",
          popover: {
            title: t("tour.metrics.step2.title"),
            description: t("tour.metrics.step2.description"),
            side: "top",
            align: "start",
          },
        },
      ];

    case "/settings":
      return [
        {
          element: "[data-tour='settings-gmail']",
          popover: {
            title: t("tour.settings.step1.title"),
            description: t("tour.settings.step1.description"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-tour='settings-language']",
          popover: {
            title: t("tour.settings.step2.title"),
            description: t("tour.settings.step2.description"),
            side: "bottom",
            align: "start",
          },
        },
        pushSupported
          ? {
              element: "[data-tour='settings-push-notification']",
              popover: {
                title: t("tour.settings.step3.title"),
                description: t("tour.settings.step3.description"),
                side: "bottom",
                align: "start",
              },
            }
          : {
              popover: {
                title: t("tour.settings.step3.title"),
                description: t("tour.settings.step3.unsupported"),
                align: "center",
              },
            },
        {
          element: "[data-tour='settings-notifications']",
          popover: {
            title: t("tour.settings.step4.title"),
            description: t("tour.settings.step4.description"),
            side: "top",
            align: "start",
          },
        },
      ];
  }
}

// ─── Tour launcher ────────────────────────────────────────────────────────────

function launchTour(
  route: TourRoute,
  t: (key: string) => string,
  driverRef: MutableRefObject<Driver | null>
) {
  driverRef.current?.destroy();

  const steps = buildStepsForRoute(route, t);
  if (!steps.length) return;

  // Only the X button sets skip_all.
  // Clicking "Finalizar" OR clicking outside the popover (overlay) just
  // marks this route's tour as done and leaves the others untouched.
  const closedWithX = { value: false };

  const driverObj = driver({
    showProgress: true,
    progressText: t("tour.ui.progress"),
    nextBtnText: t("tour.ui.next"),
    prevBtnText: t("tour.ui.prev"),
    doneBtnText: t("tour.ui.done"),
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 8,
    steps,
    onCloseClick: () => {
      // X button → user explicitly dismisses all tours
      closedWithX.value = true;
    },
    onDestroyed: () => {
      if (closedWithX.value) {
        localStorage.setItem(SKIP_ALL_KEY, "true");
      } else {
        // "Finalizar" button or overlay click → done for this route only
        localStorage.setItem(DONE_KEYS[route], "true");
      }
    },
  });

  driverRef.current = driverObj;
  driverObj.drive();
}

// ─── useTourStatus ─────────────────────────────────────────────────────────
// Lightweight hook for the Settings page — reads/writes state without driver.js.

export function useTourStatus() {
  const isSkippedAll = checkSkipAll();
  const completedCount = TOUR_ROUTES.filter(r => checkDone(r)).length;
  const totalCount = TOUR_ROUTES.length;

  return {
    isSkippedAll,
    completedCount,
    totalCount,
    skipAll: () => localStorage.setItem(SKIP_ALL_KEY, "true"),
    resetAll: resetAllTours,
  };
}

// ─── useTour ───────────────────────────────────────────────────────────────
// Full hook — mounted in DashboardLayout (stays alive across all protected routes).
// Watches location.pathname and auto-launches the matching tour on first visit.

export function useTour() {
  const { t } = useTranslation();
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const route = location.pathname;

    if (!isTourRoute(route)) return;
    if (checkSkipAll()) return;
    if (checkDone(route)) return;
    if (triggeredThisSession.has(route)) return;

    triggeredThisSession.add(route);

    const timer = setTimeout(() => {
      launchTour(route, t, driverRef);
    }, 700);

    return () => clearTimeout(timer);
    // t is stable from i18next, location.pathname is the actual dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
