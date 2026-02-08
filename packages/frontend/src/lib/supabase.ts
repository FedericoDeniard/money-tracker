import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config";

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  // Return existing instance if already initialized
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    const config = await getConfig();
    supabaseInstance = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );

    return supabaseInstance;
  })();

  return initPromise;
}

// For backward compatibility - will be initialized on first use
export let supabase: SupabaseClient;

// Initialize on first import
getSupabase().then((client) => {
  supabase = client;
});
