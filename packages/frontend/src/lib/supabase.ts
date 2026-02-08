import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { getConfig } from "../config";

let supabaseInstance: SupabaseClient<Database> | null = null;
let initPromise: Promise<SupabaseClient<Database>> | null = null;

export async function getSupabase(): Promise<SupabaseClient<Database>> {
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
export let supabase: SupabaseClient<Database>;

// Initialize on first import
getSupabase().then((client) => {
  supabase = client;
});
