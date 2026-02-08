// Gmail Watch Renewal Edge Function - Renews expiring Gmail watches
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    const results: { email: string; status: string; expiration?: string; error?: string }[] = []

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

        // Use plain text tokens directly
        const accessToken = tokenData.access_token

        // Renew the watch via Gmail API
        const watchResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/watch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            labelIds: ['INBOX'],
            topicName: watch.topic_name,
            labelFilterAction: 'include',
          }),
        })

        if (!watchResponse.ok) {
          const errorText = await watchResponse.text()
          throw new Error(`Gmail watch API failed: ${errorText}`)
        }

        const watchData = await watchResponse.json()

        // Update watch in database
        const watchExpiration = watchData.expiration
          ? new Date(parseInt(watchData.expiration)).toISOString()
          : null

        const { error: updateError } = await supabase
          .from('gmail_watches')
          .update({
            watch_id: watchData.historyId || null,
            expiration: watchExpiration,
            history_id: watchData.historyId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', watch.id)

        if (updateError) {
          throw updateError
        }

        renewedCount++
        results.push({ 
          email: watch.gmail_email, 
          status: 'renewed',
          expiration: watchExpiration || undefined
        })

      } catch (error) {
        console.error(`Failed to renew watch for ${watch.gmail_email}:`, error)
        results.push({ 
          email: watch.gmail_email, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    console.log(`Renewal completed: ${renewedCount} renewed, ${failedCount} failed`)

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
