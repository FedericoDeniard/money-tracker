// Configuration fetched from server API endpoint
// Server reads from .env and exposes public config

export interface AppConfig {
  supabase: { url: string; anonKey: string };
  backendUrl: string;
  /** URL of the standalone Mastra server (e.g. http://localhost:4111). */
  mastraServerUrl: string;
  /** VAPID public key for Web Push subscriptions. Null if push is not configured on the server. */
  vapidPublicKey: string | null;
  /** Whether the chat/assistant feature is enabled. Defaults to true on the server. */
  chatEnabled: boolean;
}

let configCache: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (configCache) {
    return configCache;
  }

  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("Failed to fetch configuration from server");
  }

  configCache = await response.json();

  if (!configCache?.supabase?.url || !configCache?.supabase?.anonKey) {
    throw new Error("Invalid configuration received from server");
  }

  return configCache;
}
