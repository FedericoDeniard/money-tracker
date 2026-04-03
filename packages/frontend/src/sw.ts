/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Replaced at build time — ensures the browser byte-compares a new SW on every deploy.
const _BUILD_TS = __BUILD_TIMESTAMP__;
void _BUILD_TS;

// ─── Lifecycle ───────────────────────────────────────────────────────────────
// Don't call skipWaiting() here — the app sends a SKIP_WAITING message when
// the user explicitly accepts the update via the toast prompt.
self.addEventListener("install", () => {
  console.log("[sw] installed", _BUILD_TS);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// ─── Message handler ─────────────────────────────────────────────────────────
self.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Push event ───────────────────────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: { title: string; body: string; url?: string };

  try {
    data = event.data.json();
  } catch {
    data = { title: "Money Tracker", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo192.png",
      badge: "/logo192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data?.url as string | undefined) ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url, self.location.origin);
          if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
