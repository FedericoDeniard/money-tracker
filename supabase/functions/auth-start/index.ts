// OAuth Start Edge Function - Initiates Google OAuth flow
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUserToken } from '../_shared/auth.ts'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) {
    return preflightResponse
  }
  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Get token from URL parameter
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const authResult = await requireUserToken(token || '', corsHeaders)
    if (authResult instanceof Response) {
      return authResult
    }

    // Get Google OAuth configuration
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('OAUTH_REDIRECT_URI') || 'http://127.0.0.1:54321/functions/v1/auth-callback'
    
    console.log('Auth Start Debug:')
    console.log('  Redirect URI:', redirectUri)
    console.log('  Client ID present:', clientId ? 'yes' : 'no')
    
    if (!clientId) {
      console.error('Missing Google OAuth configuration')
      return new Response(
        JSON.stringify({ error: 'OAuth configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate Google OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes.join(' '))
    authUrl.searchParams.set('state', token) // Pass Supabase token as state
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    // Redirect to Google OAuth
    return Response.redirect(authUrl.toString(), 302)

  } catch (error) {
    console.error('Auth start error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/auth-start' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
    --header 'Content-Type: application/json' \
    --data '{"token":"your-supabase-jwt-token"}'

*/
