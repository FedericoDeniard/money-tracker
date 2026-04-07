import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import devIndex from "./index.html";

// Log environment variables on startup
console.log("Environment variables loaded:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "✗");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓" : "✗");
console.log("VAPID_PUBLIC_KEY:", process.env.VAPID_PUBLIC_KEY ? "✓" : "✗");
console.log(
  "Edge Functions URL:",
  `${(process.env.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`
);

const isProd = process.env.NODE_ENV === "production";

// Resolve the dist directory (where the built app lives in production)
const distDir = join(import.meta.dir, "..", "dist");
// Resolve the public directory (static assets: manifest, icons)
const publicDir = join(import.meta.dir, "..", "public");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function serveStaticFile(filePath: string, contentType: string): Response {
  if (!existsSync(filePath)) {
    return withSecurityHeaders(new Response("Not found", { status: 404 }));
  }
  const content = readFileSync(filePath);
  return withSecurityHeaders(
    new Response(content, { headers: { "Content-Type": contentType } })
  );
}

const server = serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0", // Listen on all network interfaces for Railway

  routes: {
    // API endpoint to expose public config (including VAPID public key for push)
    "/api/config": () => {
      const config = {
        supabase: {
          url: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
          anonKey: process.env.SUPABASE_ANON_KEY,
        },
        backendUrl: `${(process.env.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`,
        // Public VAPID key for Web Push subscription — safe to expose
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      };

      if (!config.supabase.url || !config.supabase.anonKey) {
        console.error("Missing environment variables!");
        return new Response("Server configuration error", { status: 500 });
      }

      return withSecurityHeaders(Response.json(config));
    },

    // Service worker — served from the compiled dist/ in production,
    // or from src/ in dev mode (Bun bundles it on the fly)
    "/sw.js": () => {
      const prodPath = join(distDir, "sw.js");
      if (existsSync(prodPath)) {
        return serveStaticFile(prodPath, "application/javascript");
      }
      // In dev mode the SW is not pre-built — return a minimal stub so the
      // browser can register a SW without error. The real SW is built on `bun run build`.
      return withSecurityHeaders(
        new Response(
          '// Dev mode: run "bun run build" to generate the full service worker\n',
          { headers: { "Content-Type": "application/javascript" } }
        )
      );
    },

    // PWA Web App Manifest
    "/manifest.webmanifest": () =>
      serveStaticFile(
        join(publicDir, "manifest.webmanifest"),
        "application/manifest+json"
      ),

    // PWA icons
    "/logo192.png": () =>
      serveStaticFile(join(publicDir, "logo192.png"), "image/png"),
    "/logo512.png": () =>
      serveStaticFile(join(publicDir, "logo512.png"), "image/png"),

    // Catch-all: in production serve static files from dist/ with SPA fallback.
    // In dev use the HTML module import so Bun's HMR works.
    "/*": isProd
      ? (req: Request) => {
          const pathname = new URL(req.url).pathname;
          if (pathname !== "/" && pathname !== "") {
            const filePath = join(distDir, pathname.slice(1));
            if (existsSync(filePath)) {
              const ext = (filePath.split(".").pop() ?? "").toLowerCase();
              const mimeTypes: Record<string, string> = {
                js: "application/javascript",
                css: "text/css",
                map: "application/json",
                svg: "image/svg+xml",
                png: "image/png",
                ico: "image/x-icon",
                html: "text/html",
                webmanifest: "application/manifest+json",
              };
              return serveStaticFile(
                filePath,
                mimeTypes[ext] ?? "application/octet-stream"
              );
            }
          }
          // SPA fallback — let React Router handle the route
          return serveStaticFile(join(distDir, "index.html"), "text/html");
        }
      : devIndex,
  },

  development: !isProd && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
