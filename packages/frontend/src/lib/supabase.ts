import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config";

let supabaseInstance: SupabaseClient | null = null;

export async function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = await getConfig();

  supabaseInstance = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  );

  return supabaseInstance;
}

// For backward compatibility - will be initialized on first use
export let supabase: SupabaseClient;

// Initialize immediately
getSupabase().then((client) => {
  supabase = client;
});
