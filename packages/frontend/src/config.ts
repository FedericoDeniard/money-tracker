// Direct configuration from environment variables
// No backend dependency - reads directly from process.env

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  backendUrl: (process.env.SUPABASE_URL || 'http://127.0.0.1:54321') + '/functions/v1',
};

export async function getConfig() {
  // Validate configuration
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY");
  }

  return config;
}
