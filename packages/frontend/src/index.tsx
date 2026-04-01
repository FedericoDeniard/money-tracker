import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import index from "./index.html";

// Log environment variables on startup
console.log("Environment variables loaded:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✓" : "✗");
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓" : "✗");
console.log("VAPID_PUBLIC_KEY:", process.env.VAPID_PUBLIC_KEY ? "✓" : "✗");
console.log(
  "Edge Functions URL:",
  `${(process.env.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`
);

// Resolve the dist directory (where the built sw.js lives in production)
const distDir = join(import.meta.dir, "..", "dist");
// Resolve the public directory (static assets: manifest, icons)
const publicDir = join(import.meta.dir, "..", "public");

function serveStaticFile(filePath: string, contentType: string): Response {
  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }
  const content = readFileSync(filePath);
  return new Response(content, {
    headers: { "Content-Type": contentType },
  });
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

      return Response.json(config);
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
      return new Response(
        '// Dev mode: run "bun run build" to generate the full service worker\n',
        { headers: { "Content-Type": "application/javascript" } }
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

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
