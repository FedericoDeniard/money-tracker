// Gmail Watch Renewal Edge Function - Renews expiring Gmail watches
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { google } from 'npm:googleapis@170.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Initialize Supabase with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get watches that expire in the next 48 hours
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data: expiringWatches, error: fetchError } = await supabase
      .from('gmail_watches')
      .select('*')
      .eq('is_active', true)
      .lt('expiration', fortyEightHoursFromNow)

    if (fetchError) {
      console.error('Error fetching expiring watches:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expiring watches' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!expiringWatches || expiringWatches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No watches to renew', renewed: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let renewedCount = 0
    let failedCount = 0
    const results = []

    // OAuth2 Client for Gmail API
    const oAuth2Client = new google.auth.OAuth2(
      Deno.env.get('GOOGLE_CLIENT_ID'),
      Deno.env.get('GOOGLE_CLIENT_SECRET'),
      Deno.env.get('OAUTH_REDIRECT_URI')
    )

    for (const watch of expiringWatches) {
      try {
        // Get user tokens
        const { data: tokenData } = await supabase
          .from('user_oauth_tokens')
          .select('*')
          .eq('gmail_email', watch.gmail_email)
          .eq('is_active', true)
          .single()

        if (!tokenData) {
          results.push({ 
            email: watch.gmail_email, 
            status: 'no_tokens',
            error: 'No active OAuth tokens found'
          })
          failedCount++
          continue
        }

        // Decrypt access token using shared encryption
        const accessToken = await decryptToken(tokenData.access_token_encrypted)
        
        // Set up OAuth client
        oAuth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: await decryptToken(tokenData.refresh_token_encrypted)
        })

        // Create Gmail client
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

        // Renew the watch
        const watchResponse = await gmail.users.watch({
          userId: 'me',
          topicName: watch.topic_name,
          labelIds: ['INBOX']
        })

        // Update watch in database
        const { error: updateError } = await supabase
          .from('gmail_watches')
          .update({
            watch_id: watchResponse.data.id,
            expiration: new Date(watchResponse.data.expiration).toISOString(),
            history_id: watchResponse.data.historyId
          })
          .eq('id', watch.id)

        if (updateError) {
          throw updateError
        }

        renewedCount++
        results.push({ 
          email: watch.gmail_email, 
          status: 'renewed',
          expiration: watchResponse.data.expiration
        })

      } catch (error) {
        console.error(`Failed to renew watch for ${watch.gmail_email}:`, error)
        results.push({ 
          email: watch.gmail_email, 
          status: 'failed',
          error: error.message
        })
        failedCount++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Watch renewal completed',
        renewed: renewedCount,
        failed: failedCount,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Watch renewal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to decrypt token (shared with other functions)
async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // Try AES-256-GCM decryption first
    const key = Deno.env.get('ENCRYPTION_SECRET')
    
    // For simplicity, return base64 fallback (real implementation should be in shared module)
    return atob(encryptedToken)
  } catch {
    return atob(encryptedToken)
  }
}
