/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// ─── Push event ───────────────────────────────────────────────────────────────
// Receives a JSON payload from the server:
//   { title: string, body: string, i18nParams: Record<string, unknown>, url: string }
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: { title: string; body: string; url?: string };

  try {
    data = event.data.json();
  } catch {
    // Fallback if the payload isn't JSON
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
// Focuses an existing open tab at the notification URL, or opens a new window.
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url = (event.notification.data?.url as string | undefined) ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        // Try to focus an already-open tab on the same origin
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url, self.location.origin);
          if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
            return client.focus();
          }
        }
        // No open tab found — open a new window
        return self.clients.openWindow(url);
      })
  );
});
