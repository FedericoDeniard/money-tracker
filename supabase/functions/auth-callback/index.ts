// OAuth Callback Edge Function - Handles Google OAuth callback
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthCallbackResponse {
  success: boolean
  message: string
  userId?: string
  gmailEmail?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=${error}`, 302)
    }

    if (!code) {
      console.error('Missing authorization code')
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=no_code`, 302)
    }

    if (!state) {
      console.error('Missing state parameter')
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=no_state`, 302)
    }

    const userId = state

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('OAUTH_REDIRECT_URI') || 'http://localhost:3001/auth/callback'

    if (!clientId || !clientSecret) {
      console.error('Missing OAuth credentials')
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=missing_credentials`, 302)
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=token_exchange_failed`, 302)
    }

    const tokens = await tokenResponse.json()

    // Get Gmail profile
    const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      console.error('Failed to get Gmail profile')
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=profile_failed`, 302)
    }

    const profile = await profileResponse.json()
    const gmailEmail = profile.emailAddress

    if (!gmailEmail) {
      console.error('Could not retrieve Gmail email address')
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
      return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=no_email`, 302)
    }

    // Encrypt tokens (simple base64 encoding for now - replace with proper encryption)
    const encryptedAccessToken = btoa(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? btoa(tokens.refresh_token) : null

    // Calculate token expiration
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('user_oauth_tokens')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('gmail_email', gmailEmail)
      .maybeSingle()

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('user_oauth_tokens')
        .update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_type: tokens.token_type || 'Bearer',
          expires_at: expiresAt,
          scope: tokens.scope || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id)

      if (updateError) {
        console.error('Error updating token:', updateError)
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
        return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=token_update_failed`, 302)
      }

      console.log(`Reactivated existing token for ${gmailEmail}`)
    } else {
      // Create new token
      const { error: insertError } = await supabase
        .from('user_oauth_tokens')
        .insert({
          user_id: userId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_type: tokens.token_type || 'Bearer',
          expires_at: expiresAt,
          scope: tokens.scope || null,
          gmail_email: gmailEmail,
          is_active: true,
        })

      if (insertError) {
        console.error('Error saving tokens:', insertError)
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
        return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=token_save_failed`, 302)
      }

      console.log(`Created new token for ${gmailEmail}`)
    }

    // Set up Gmail watch (simplified version - full implementation would need Pub/Sub)
    console.log('Gmail OAuth completed successfully for user:', userId, 'email:', gmailEmail)

    // Redirect to frontend with success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    return Response.redirect(`${frontendUrl}/settings?success=true&email=${encodeURIComponent(gmailEmail)}`, 302)

  } catch (error) {
    console.error('OAuth callback error:', error)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    return Response.redirect(`${frontendUrl}/settings?error=oauth_failed&reason=internal_error`, 302)
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/auth-callback?code=...&state=...'

*/
