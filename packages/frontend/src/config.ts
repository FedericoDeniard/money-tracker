// Configuration fetched from server API endpoint
// Server reads from .env and exposes public config

let configCache: {
  supabase: { url: string; anonKey: string };
  backendUrl: string;
} | null = null;

export async function getConfig() {
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
