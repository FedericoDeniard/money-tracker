import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config";

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase() {
  // If instance exists, return it
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // If initialization is in progress, wait for it
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
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      },
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
