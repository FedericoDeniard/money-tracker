import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Registers the service worker and detects pending updates.
 * The browser checks for a new SW automatically on navigation — no polling needed.
 */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  // Only reload when the user explicitly triggered the update via applyUpdate().
  // This prevents an automatic reload on first-time SW installation (clients.claim()
  // also fires controllerchange, but we don't want to reload in that case).
  const isUpdating = useRef(false);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV === "development"
    )
      return;

    async function init() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (reg.waiting) {
          waitingWorker.current = reg.waiting;
          setUpdateAvailable(true);
          return;
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              waitingWorker.current = newWorker;
              setUpdateAvailable(true);
            }
          });
        });
      } catch (err) {
        console.error("[sw] Registration failed:", err);
      }
    }

    init();

    let refreshing = false;
    const onControllerChange = () => {
      if (!isUpdating.current) return;
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  const applyUpdate = useCallback(() => {
    isUpdating.current = true;
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return { updateAvailable, applyUpdate };
}
