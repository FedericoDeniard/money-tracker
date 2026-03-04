// Gmail Watch Renewal Edge Function - Renews expiring Gmail watches
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { requireInternalAuth } from '../_shared/auth.ts'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { createSystemNotification } from '../_shared/notifications.ts'
import {
  type OAuthTokenRow,
  GmailReconnectRequiredError,
  ensureFreshAccessToken,
  fetchGmailWithRecovery,
} from '../_shared/lib/gmail-auth.ts'

Deno.serve(async (req) => {
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) {
    return preflightResponse
  }
  const corsHeaders = getCorsHeaders(req)

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
    const internalAuth = requireInternalAuth(req, corsHeaders)
    if (internalAuth instanceof Response) {
      return internalAuth
    }

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
        await createSystemNotification({
          typeKey: 'gmail_watch_expiring',
          userId: watch.user_id,
          actionPath: '/settings',
          iconKey: 'mail',
          i18nParams: { email: watch.gmail_email },
          metadata: {
            gmailEmail: watch.gmail_email,
            expiration: watch.expiration,
          },
          dedupeKey: `watch-expiring-${watch.user_id}-${watch.gmail_email}`,
          dedupeWindowMinutes: 360,
          importance: 'normal',
        })

        // Get user tokens
        const { data: tokenData } = await supabase
          .from('user_oauth_tokens')
          .select('*')
          .eq('user_id', watch.user_id)
          .eq('gmail_email', watch.gmail_email)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (!tokenData) {
          await createSystemNotification({
            typeKey: 'gmail_watch_renew_failed',
            userId: watch.user_id,
            actionPath: '/settings',
            iconKey: 'mail',
            i18nParams: { email: watch.gmail_email },
            metadata: {
              gmailEmail: watch.gmail_email,
              reason: 'No active OAuth tokens found',
            },
            dedupeKey: `watch-renew-failed-${watch.user_id}-${watch.gmail_email}-no-token`,
            dedupeWindowMinutes: 180,
          })

          results.push({ 
            email: watch.gmail_email, 
            status: 'no_tokens',
            error: 'No active OAuth tokens found'
          })
          failedCount++
          continue
        }

        const oauthToken = tokenData as OAuthTokenRow
        await ensureFreshAccessToken(supabase, oauthToken, 'renew_watch_preflight')

        const watchResponse = await fetchGmailWithRecovery(
          supabase,
          oauthToken,
          'https://www.googleapis.com/gmail/v1/users/me/watch',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              labelIds: ['INBOX'],
              topicName: watch.topic_name,
              labelFilterAction: 'include',
            }),
          },
          'renew_watch',
        )

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
        if (error instanceof GmailReconnectRequiredError) {
          const { error: deleteWatchError } = await supabase
            .from('gmail_watches')
            .delete()
            .eq('user_id', watch.user_id)
            .eq('gmail_email', watch.gmail_email)

          if (deleteWatchError) {
            console.error(`Failed to delete watch for ${watch.gmail_email}:`, deleteWatchError)
          }

          results.push({
            email: watch.gmail_email,
            status: 'disconnected',
            error: 'Invalid Gmail credentials. Account disconnected; user must reconnect.',
          })
          failedCount++
          continue
        }

        console.error(`Failed to renew watch for ${watch.gmail_email}:`, error)
        await createSystemNotification({
          typeKey: 'gmail_watch_renew_failed',
          userId: watch.user_id,
          actionPath: '/settings',
          iconKey: 'mail',
          i18nParams: { email: watch.gmail_email },
          metadata: {
            gmailEmail: watch.gmail_email,
            reason: error instanceof Error ? error.message : 'Unknown error',
          },
          dedupeKey: `watch-renew-failed-${watch.user_id}-${watch.gmail_email}`,
          dedupeWindowMinutes: 180,
          importance: 'high',
        })

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
