// Configuration utilities for Edge Functions

export function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || "https://nswqfbakcbfaxuoguqhe.supabase.co";
}

export function getEdgeFunctionsUrl(): string {
  return `${getSupabaseUrl()}/functions/v1`;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
  };
}

export function getXAIConfig() {
  return {
    apiKey: process.env.XAI_API_KEY,
  };
}
