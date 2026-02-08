// Configuration utilities for Edge Functions

export function getSupabaseUrl(): string {
  return Deno.env.get('SUPABASE_URL') || 'https://nswqfbakcbfaxuoguqhe.supabase.co'
}

export function getEdgeFunctionsUrl(): string {
  return `${getSupabaseUrl()}/functions/v1`
}

export function getGoogleOAuthConfig() {
  return {
    clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
    clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
    redirectUri: Deno.env.get('OAUTH_REDIRECT_URI')
  }
}

export function getXAIConfig() {
  return {
    apiKey: Deno.env.get('XAI_API_KEY')
  }
}

export function getEncryptionSecret(): string {
  return Deno.env.get('ENCRYPTION_SECRET') || 'fallback-encryption-secret-32-chars-long'
}
