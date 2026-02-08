// Gmail Disconnect Edge Function - Handles Gmail disconnection
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow DELETE method
    if (req.method !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get connection ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 1]

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connection ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user is authenticated using anon client
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use service role for DB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the token data first and verify ownership
    const { data: tokenData, error: fetchError } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Connection not found or unauthorized' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if there are other users with the same Gmail account
    const { data: otherTokens } = await supabase
      .from('user_oauth_tokens')
      .select('id')
      .eq('gmail_email', tokenData.gmail_email)
      .eq('is_active', true)
      .neq('id', connectionId)

    const hasOtherUsers = otherTokens && otherTokens.length > 0

    // Only stop the Gmail watch if this is the last user with this account
    if (!hasOtherUsers) {
      try {
        const accessToken = tokenData.access_token
        await fetch('https://www.googleapis.com/gmail/v1/users/me/stop', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        console.log(`Watch stopped for ${tokenData.gmail_email} (last user)`)
      } catch (error) {
        console.warn('Could not stop watch (may not exist)', error)
      }

      // Delete ALL Gmail watches for this email
      await supabase
        .from('gmail_watches')
        .delete()
        .eq('gmail_email', tokenData.gmail_email)
    } else {
      console.log(`Not stopping watch for ${tokenData.gmail_email} (${otherTokens.length} other user(s) still connected)`)

      // Only delete watches for THIS user
      await supabase
        .from('gmail_watches')
        .delete()
        .eq('gmail_email', tokenData.gmail_email)
        .eq('user_id', user.id)
    }

    // Soft delete: Mark token as inactive instead of deleting
    const { error: updateError } = await supabase
      .from('user_oauth_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error deactivating token:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect Gmail' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Token deactivated for user ${user.id}, transactions preserved`)

    return new Response(
      JSON.stringify({ success: true, message: 'Gmail disconnected successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Gmail disconnect error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
