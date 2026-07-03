// Configuration fetched from server API endpoint
// Server reads from .env and exposes public config
//
// NB: previously this kept a module-level `configCache` so we only fetched
// once per page load. that cache became stale during dev whenever the
// tunnel host was rotated (every fresh `bun docker:down && bun docker:up`
// gives you a new trycloudflare subdomain) — bun HMR reloaded neighboring
// modules but not config.ts's module-level state. each call now refetches;
// the cost is one tiny JSON request per consumer and we always see fresh
// values.

export interface AppConfig {
  supabase: { url: string; anonKey: string };
  backendUrl: string;
  /** URL of the standalone Mastra server (e.g. http://localhost:4111). */
  mastraServerUrl: string;
  /** VAPID public key for Web Push subscriptions. Null if push is not configured on the server. */
  vapidPublicKey: string | null;
  /** Whether the chat/assistant feature is enabled. Defaults to true on the server. */
  chatEnabled: boolean;
  /**
   * Public URL of this app (no trailing slash). Used to build absolute
   * redirect targets (e.g. the post-payment back_url for MercadoPago).
   * Falls back to the browser origin when unset (typical in dev).
   */
  appUrl: string;
}

export async function getConfig(): Promise<AppConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("Failed to fetch configuration from server");
  }

  const config = (await response.json()) as AppConfig;

  if (!config?.supabase?.url || !config?.supabase?.anonKey) {
    throw new Error("Invalid configuration received from server");
  }

  return config;
}
