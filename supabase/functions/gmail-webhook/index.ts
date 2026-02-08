// Gmail Webhook Edge Function - Processes real-time Gmail notifications
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { extractTransactionFromEmail } from '../_shared/ai/transaction-agent.ts'
import { extractImageAttachments, extractPdfTexts } from '../_shared/lib/attachment-extractor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Set to avoid processing the same message multiple times
const processedMessages = new Set<string>()

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
    // Verify the request is from Google Pub/Sub
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Webhook received without proper authorization header')
      // TODO: enforce auth rejection after configuring Pub/Sub OIDC token verification
    }

    // Verify the message has the expected structure
    const body = await req.json()
    
    if (!body || !body.message || !body.message.data) {
      console.error('Invalid webhook payload structure')
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Decode the base64 message
    const data = JSON.parse(atob(body.message.data))
    
    const gmailEmail = data.emailAddress
    const historyId = data.historyId

    // Avoid processing the same historyId multiple times
    const historyKey = `${gmailEmail}-${historyId}`
    if (processedMessages.has(historyKey)) {
      return new Response('OK', { status: 200 })
    }
    
    processedMessages.add(historyKey)
    console.log('Processing notification', { gmailEmail })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Find ALL user tokens for this Gmail account
    const { data: allTokens, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('gmail_email', gmailEmail)
      .eq('is_active', true)

    if (tokenError || !allTokens || allTokens.length === 0) {
      console.error('No active tokens found for', { gmailEmail })
      return new Response('OK', { status: 200 })
    }

    console.log(`Found ${allTokens.length} active token(s) for ${gmailEmail}`)

    // Verify which tokens are valid
    const validTokens = []

    for (const tokenData of allTokens) {
      try {
        // Check if token is expired by date first
        const now = new Date()
        const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null

        if (expiresAt && now >= expiresAt) {
          // Try to refresh if we have refresh token
          if (tokenData.refresh_token) {
            console.log(`Attempting to refresh expired token for user ${tokenData.user_id}`)
            const refreshToken = tokenData.refresh_token

            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
                client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }),
            })

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json()
              const newExpiresAt = refreshData.expires_in
                ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
                : null

              await supabase
                .from('user_oauth_tokens')
                .update({
                  access_token: refreshData.access_token,
                  expires_at: newExpiresAt,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', tokenData.id)

              // Update tokenData with new credentials
              tokenData.access_token = refreshData.access_token
              tokenData.expires_at = newExpiresAt

              validTokens.push(tokenData)
              console.log(`Token refreshed successfully for user ${tokenData.user_id}`)
            } else {
              console.warn(`Failed to refresh token for user ${tokenData.user_id}`)
              continue
            }
          } else {
            console.warn(`Expired token without refresh_token for user ${tokenData.user_id}`)
            continue
          }
        } else {
          // Token not expired by date, verify with Google
          const accessToken = tokenData.access_token

          const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
          )

          if (response.ok) {
            validTokens.push(tokenData)
            console.log(`Valid token for user ${tokenData.user_id}`)
          } else {
            console.warn(`Invalid token for user ${tokenData.user_id}`)
          }
        }
      } catch (error) {
        console.error(`Error verifying token for user ${tokenData.user_id}`, { error })
      }
    }

    if (validTokens.length === 0) {
      console.error('No valid tokens to process this email')
      return new Response('OK', { status: 200 })
    }

    console.log(`${validTokens.length} valid token(s) found`)

    // Use the first valid token to read the message
    const firstToken = validTokens[0]

    // Get the last historyId saved
    const { data: watchData } = await supabase
      .from('gmail_watches')
      .select('history_id, topic_name')
      .eq('gmail_email', gmailEmail)
      .eq('is_active', true)
      .order('history_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!watchData?.history_id) {
      // No saved historyId — save current one so next notification works properly
      console.log('No saved historyId, initializing gmail_watches record')
      await supabase.from('gmail_watches').upsert(
        {
          user_id: firstToken.user_id,
          gmail_email: gmailEmail,
          history_id: historyId.toString(),
          is_active: true,
          topic_name: watchData?.topic_name || 'projects/unknown/topics/gmail-notifications',
          label_ids: ['INBOX'],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,gmail_email' }
      )
      return new Response('OK', { status: 200 })
    }

    // Use History API to find new INBOX messages since last processed historyId
    const historyUrl = `https://www.googleapis.com/gmail/v1/users/me/history?startHistoryId=${watchData.history_id}&historyTypes=messageAdded&labelId=INBOX`
    
    const historyResponse = await fetch(historyUrl, {
      headers: {
        'Authorization': `Bearer ${firstToken.access_token}`,
      },
    })

    if (!historyResponse.ok) {
      console.error('Failed to fetch history:', historyResponse.statusText)
      return new Response('OK', { status: 200 })
    }

    const historyData = await historyResponse.json()
    const history = historyData.history

    if (!history || history.length === 0) {
      // Update historyId even if no new messages (could be a draft/label event)
      await supabase
        .from('gmail_watches')
        .update({ history_id: historyId.toString(), updated_at: new Date().toISOString() })
        .eq('gmail_email', gmailEmail)
        .eq('is_active', true)
      console.log('No new INBOX messages (probably a draft/label/read event)')
      return new Response('OK', { status: 200 })
    }

    const addedMessages = history
      .flatMap((h: any) => h.messagesAdded || [])
      .filter((m: any) => m.message?.labelIds?.includes('INBOX'))

    if (addedMessages.length === 0) {
      await supabase
        .from('gmail_watches')
        .update({ history_id: historyId.toString(), updated_at: new Date().toISOString() })
        .eq('gmail_email', gmailEmail)
        .eq('is_active', true)
      console.log('No new messages in INBOX')
      return new Response('OK', { status: 200 })
    }

    const latestMessage = addedMessages[addedMessages.length - 1]
    const messageId = latestMessage?.message?.id
    if (!messageId) {
      return new Response('OK', { status: 200 })
    }

    console.log('Processing message', { messageId })

    // Update historyId in database
    await supabase
      .from('gmail_watches')
      .update({ history_id: historyId.toString(), updated_at: new Date().toISOString() })
      .eq('gmail_email', gmailEmail)
      .eq('is_active', true)

    // Get full message details
    const messageResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${firstToken.access_token}`,
        },
      }
    )

    if (!messageResponse.ok) {
      console.error('Failed to fetch message:', messageResponse.statusText)
      return new Response('OK', { status: 200 })
    }

    const message = await messageResponse.json()

    // Verify that the email is in INBOX and not in SPAM
    const labelIds = message.labelIds || []
    if (!labelIds.includes('INBOX') || labelIds.includes('SPAM') || labelIds.includes('TRASH')) {
      return new Response('OK', { status: 200 })
    }

    // Extract important headers
    const headers = message.payload?.headers || []
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || ''
    const dateHeader = headers.find((h: any) => h.name === 'Date')?.value
    const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()

    // Extract sender email
    const fromEmailMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/)
    const fromEmail = fromEmailMatch ? (fromEmailMatch[1] || fromEmailMatch[0]) : fromHeader

    // Extract body text
    const bodyText = extractBodyText(message.payload)

    // Get user context for AI
    let userFullName: string | undefined
    if (validTokens.length > 0) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        validTokens[0].user_id
      )
      if (!userError && userData?.user?.user_metadata?.full_name) {
        userFullName = userData.user.user_metadata.full_name
        console.log('User context for AI', { userFullName })
      }
    }

    // Extract attachments for AI analysis
    const images = await extractImageAttachments(firstToken.access_token, message.id, message.payload)
    const pdfTexts = await extractPdfTexts(firstToken.access_token, message.id, message.payload)

    const fullContent = bodyText

    console.log('Analyzing email...', {
      bodyTextLength: bodyText.length,
      imageCount: images.length,
      pdfCount: pdfTexts.length,
    })

    // Use AI to extract transaction information (with images and PDF text if available)
    try {
      const aiResult = await extractTransactionFromEmail(fullContent, userFullName, images, pdfTexts)
      
      if (aiResult.hasTransaction) {
        console.log('Transaction detected by AI', { fromEmail, subject })
        const transaction = aiResult.data

        // Create transaction for each user with valid token
        for (const tokenData of validTokens) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert({
              user_oauth_token_id: tokenData.id,
              source_email: fromEmail,
              source_message_id: message.id,
              date: date,
              amount: transaction.amount,
              currency: transaction.currency,
              transaction_type: transaction.type,
              transaction_description: transaction.description,
              transaction_date: transaction.date || date.split('T')[0],
              merchant: transaction.merchant,
              category: transaction.category,
            })

          if (insertError) {
            if (insertError.code === '23505') {
              console.log(`Transaction already exists for user ${tokenData.user_id}`)
            } else {
              console.error(`Error saving transaction for user ${tokenData.user_id}`, { error: insertError })
            }
          } else {
            console.log(`AI transaction saved for user ${tokenData.user_id}: ${transaction.amount} ${transaction.currency}`)
          }
        }

        console.log(`AI transaction processed for ${validTokens.length} user(s)`)
      } else {
        console.log('No transaction detected by AI - discarding')

        // Save in discarded_emails for each valid user
        for (const tokenData of validTokens) {
          const { error: discardError } = await supabase
            .from('discarded_emails')
            .insert({
              user_oauth_token_id: tokenData.id,
              message_id: message.id,
              reason: aiResult.reason || 'No transaction detected',
            })

          if (discardError) {
            if (discardError.code === '23505') {
              console.log(`Email already discarded for user ${tokenData.user_id}`)
            } else {
              console.error(`Error saving discarded email for user ${tokenData.user_id}`, { error: discardError })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in AI processing:', error)
      
      // Fallback to keyword detection
      const transactionKeywords = ['purchase', 'payment', 'charge', 'debit', 'credit', 'invoice', 'receipt', '$', '€', '£']
      const hasTransactionKeywords = transactionKeywords.some(keyword => 
        subject.toLowerCase().includes(keyword) || bodyText.toLowerCase().includes(keyword)
      )

      if (hasTransactionKeywords) {
        console.log('Fallback: Transaction detected by keywords', { fromEmail, subject })

        // Create transaction for each user with valid token
        for (const tokenData of validTokens) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert({
              user_oauth_token_id: tokenData.id,
              source_email: fromEmail,
              source_message_id: message.id,
              date: date,
              amount: 0,
              currency: 'USD',
              transaction_type: 'expense',
              transaction_description: subject,
              transaction_date: date.split('T')[0],
              merchant: fromEmail,
              category: 'uncategorized',
            })

          if (insertError) {
            if (insertError.code === '23505') {
              console.log(`Transaction already exists for user ${tokenData.user_id}`)
            } else {
              console.error(`Error saving transaction for user ${tokenData.user_id}`, { error: insertError })
            }
          } else {
            console.log(`Fallback transaction saved for user ${tokenData.user_id}`)
          }
        }

        console.log(`Fallback transaction processed for ${validTokens.length} user(s)`)
      } else {
        console.log('No transaction detected - discarding')

        // Save in discarded_emails for each valid user
        for (const tokenData of validTokens) {
          const { error: discardError } = await supabase
            .from('discarded_emails')
            .insert({
              user_oauth_token_id: tokenData.id,
              message_id: message.id,
              reason: 'No transaction detected (fallback)',
            })

          if (discardError && discardError.code !== '23505') {
            console.error(`Error saving discarded email for user ${tokenData.user_id}`, { error: discardError })
          }
        }
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Error processing webhook', { error })
    return new Response('OK', { status: 500 })
  }
})

function extractBodyText(payload: any): string {
  let text = ''

  if (payload.body?.data) {
    text = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const plainText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        if (plainText.trim()) {
          text = plainText
          break
        }
      }
      // If multipart, search recursively
      if (part.mimeType?.startsWith('multipart/')) {
        const nestedText = extractBodyText(part)
        if (nestedText.trim()) {
          text = nestedText
        }
      }
    }

    // If no text/plain found, try text/html
    if (!text.trim()) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const htmlText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
          // Extract basic text from HTML
          text = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          if (text) break
        }
      }
    }
  }

  return text
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with Gmail webhook payload:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-webhook' \
    --header 'Content-Type: application/json' \
    --data '{
      "message": {
        "data": "eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoxMjM0NX0="
      }
    }'

*/
