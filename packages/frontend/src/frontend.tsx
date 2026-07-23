/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { App } from "./App";
import { APP_VERSION } from "./lib/version";

document.title =
  process.env.NODE_ENV === "production" ? "Receiptle" : "Receiptle - Dev";

if (process.env.NODE_ENV !== "production") {
  import("react-grab");
}

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://f7412c2f69834bacbcb32d504da177b6@glitchtip-web-production-dbe1.up.railway.app/1",
    environment: "production",
    release: APP_VERSION,
    tracesSampleRate: 0.01,
    autoSessionTracking: false,
    attachStacktrace: true,
    beforeSend(event) {
      const headers = event.request?.headers as
        | Record<string, string>
        | undefined;
      if (headers) {
        for (const key of Object.keys(headers)) {
          const lower = key.toLowerCase();
          if (
            lower === "authorization" ||
            lower === "cookie" ||
            lower === "apikey"
          ) {
            delete headers[key];
          }
        }
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
