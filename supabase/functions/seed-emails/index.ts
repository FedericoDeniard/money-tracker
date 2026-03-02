// Seed Emails Edge Function - Chunked processing with auto-invocation
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { extractTransactionFromEmail } from "../_shared/ai/transaction-agent.ts"
import { extractImageAttachments, extractPdfTexts } from "../_shared/lib/attachment-extractor.ts"
import { createSupabaseClient } from "../_shared/lib/supabase.ts"
import { createSystemNotification } from "../_shared/notifications.ts"
import {
  type OAuthTokenRow,
  GmailReconnectRequiredError,
  ensureFreshAccessToken,
  fetchGmailWithRecovery,
} from "../_shared/lib/gmail-auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SeedRequest {
  connectionId?: string
  seedId?: string
  resume?: boolean
}

const MONTHS_TO_SEED = 3
const CHUNK_SIZE = 30
const CONCURRENCY = 10

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token with Supabase using anon client
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error?.message, 'Token prefix:', token.substring(0, 20))
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userId = user.id
    const body: SeedRequest = await req.json()

    // --- RESUME MODE: continue processing an existing seed ---
    if (body.resume && body.seedId) {
      // Verify seed belongs to authenticated user
      const { data: seedOwner } = await supabase
        .from('seeds')
        .select('user_id')
        .eq('id', body.seedId)
        .maybeSingle()

      if (!seedOwner || seedOwner.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Seed not found or unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        const result = await processChunk(supabase, body.seedId, token)
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (processError) {
        await supabase.from('seeds').update({
          status: 'failed',
          error_message: processError instanceof Error ? processError.message : 'Seed processing failed',
          updated_at: new Date().toISOString(),
        }).eq('id', body.seedId)

        if (processError instanceof GmailReconnectRequiredError) {
          return new Response(
            JSON.stringify({
              error: processError.message,
              code: processError.code,
              reconnectRequired: true,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await createSystemNotification({
          typeKey: 'seed_failed',
          userId,
          actionPath: '/settings',
          iconKey: 'alert',
          i18nParams: {
            reason: processError instanceof Error ? processError.message : 'Unknown error',
          },
          metadata: {
            seedId: body.seedId,
            stage: 'resume',
          },
          dedupeKey: `seed-failed-${body.seedId}`,
          dedupeWindowMinutes: 60,
        })

        return new Response(
          JSON.stringify({ error: 'Failed to process seed chunk' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // --- NEW SEED MODE ---
    const { connectionId } = body
    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify connection belongs to user
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('id, user_id, gmail_email, access_token, refresh_token, expires_at, is_active')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Connection not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing in-progress seed
    const { data: existingSeed } = await supabase
      .from('seeds')
      .select('id, status')
      .eq('user_oauth_token_id', connectionId)
      .in('status', ['pending', 'processing'])
      .maybeSingle()

    if (existingSeed) {
      return new Response(
        JSON.stringify({ error: 'A seed is already in progress', seedId: existingSeed.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all Gmail message IDs
    await ensureFreshAccessToken(supabase, tokenData as OAuthTokenRow, 'seed_start')
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - MONTHS_TO_SEED)
    const afterDate = threeMonthsAgo.toISOString().split('T')[0]?.replace(/-/g, '/') || ''
    const query = `after:${afterDate}`
    const messageIds = await getAllMessageIds(supabase, tokenData as OAuthTokenRow, query)

    if (messageIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No messages found', totalMessages: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${messageIds.length} messages to process`)

    // Create seed with all message IDs stored
    const { data: newSeed, error: seedError } = await supabase
      .from('seeds')
      .insert({
        user_id: userId,
        user_oauth_token_id: connectionId,
        status: 'processing',
        message_ids: messageIds,
        total_emails: messageIds.length,
        last_processed_index: 0,
      })
      .select()
      .single()

    if (seedError || !newSeed) {
      console.error('Error creating seed:', seedError)
      return new Response(
        JSON.stringify({ error: 'Failed to create seed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Seed created', { seedId: newSeed.id, userId, gmailEmail: tokenData.gmail_email, totalMessages: messageIds.length })

    // Process first chunk
    let result
    try {
      result = await processChunk(supabase, newSeed.id, token)
    } catch (processError) {
      await supabase.from('seeds').update({
        status: 'failed',
        error_message: processError instanceof Error ? processError.message : 'Seed processing failed',
        updated_at: new Date().toISOString(),
      }).eq('id', newSeed.id)

      if (processError instanceof GmailReconnectRequiredError) {
        return new Response(
          JSON.stringify({
            error: processError.message,
            code: processError.code,
            reconnectRequired: true,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await createSystemNotification({
        typeKey: 'seed_failed',
        userId,
        actionPath: '/settings',
        iconKey: 'alert',
        i18nParams: {
          reason: processError instanceof Error ? processError.message : 'Unknown error',
        },
        metadata: {
          seedId: newSeed.id,
          stage: 'initial',
        },
        dedupeKey: `seed-failed-${newSeed.id}`,
        dedupeWindowMinutes: 60,
      })

      return new Response(
        JSON.stringify({ error: 'Failed to process initial seed chunk' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ seedId: newSeed.id, status: 'processing', ...result }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    if (error instanceof GmailReconnectRequiredError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          reconnectRequired: true,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('Error in seed-emails:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// --- CHUNK PROCESSING ---
async function processChunk(
  supabase: any,
  seedId: string,
  authToken: string
): Promise<{ done: boolean; processed: number; transactions: number; total: number }> {
  // Get seed data
  const { data: seed, error: seedError } = await supabase
    .from('seeds')
    .select('*')
    .eq('id', seedId)
    .single()

  if (seedError || !seed) {
    throw new Error(`Seed not found: ${seedId}`)
  }

  if (seed.status === 'completed' || seed.status === 'failed') {
    return { done: true, processed: seed.last_processed_index, transactions: seed.transactions_found || 0, total: seed.total_emails || 0 }
  }

  const messageIds: string[] = seed.message_ids || []
  const startIndex = seed.last_processed_index || 0
  const endIndex = Math.min(startIndex + CHUNK_SIZE, messageIds.length)
  const chunk = messageIds.slice(startIndex, endIndex)

  if (chunk.length === 0) {
    // All done
    await supabase.from('seeds').update({
      status: 'completed',
      last_processed_index: messageIds.length,
      updated_at: new Date().toISOString(),
    }).eq('id', seedId)

    await createSystemNotification({
      typeKey: (seed.transactions_found || 0) > 0
        ? 'seed_completed_with_transactions'
        : 'seed_completed_no_new',
      userId: seed.user_id,
      actionPath: '/transactions',
      iconKey: 'mail',
      i18nParams: {
        count: seed.transactions_found || 0,
        totalEmails: messageIds.length,
      },
      metadata: {
        seedId,
        totalEmails: messageIds.length,
        transactionsFound: seed.transactions_found || 0,
      },
      dedupeKey: `seed-completed-${seedId}`,
      dedupeWindowMinutes: 60,
    })

    return { done: true, processed: messageIds.length, transactions: seed.transactions_found || 0, total: messageIds.length }
  }

  // Get OAuth token
  const { data: tokenData } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('id', seed.user_oauth_token_id)
    .single()

  if (!tokenData) throw new Error('OAuth tokens not found')

  await ensureFreshAccessToken(supabase, tokenData as OAuthTokenRow, 'seed_chunk')

  // Get user full name for AI context
  let userFullName: string | undefined
  const { data: userData } = await supabase.auth.admin.getUserById(seed.user_id)
  if (userData?.user?.user_metadata?.full_name) {
    userFullName = userData.user.user_metadata.full_name
  }

  console.log(`Processing chunk: messages ${startIndex}-${endIndex - 1} of ${messageIds.length}`)

  // Process chunk in parallel batches
  let transactionsFound = seed.transactions_found || 0
  let processedCount = 0

  for (let i = 0; i < chunk.length; i += CONCURRENCY) {
    const batch = chunk.slice(i, i + CONCURRENCY)

    const results = await Promise.all(
      batch.map(async (messageId: string) => {
        try {
          return await processMessage(
            supabase,
            tokenData as OAuthTokenRow,
            messageId,
            seed.user_id,
            tokenData.id,
            userFullName,
          )
        } catch (error) {
          if (error instanceof GmailReconnectRequiredError) {
            throw error
          }
          console.error(`Error processing message ${messageId}:`, error)
          return { transactionFound: false }
        }
      })
    )

    for (const result of results) {
      if (result.transactionFound) transactionsFound++
      processedCount++
    }
  }

  const newIndex = endIndex
  const isDone = newIndex >= messageIds.length

  // Update seed progress
  await supabase.from('seeds').update({
    status: isDone ? 'completed' : 'processing',
    last_processed_index: newIndex,
    emails_processed_by_ai: newIndex,
    transactions_found: transactionsFound,
    updated_at: new Date().toISOString(),
  }).eq('id', seedId)

  if (isDone) {
    await createSystemNotification({
      typeKey: transactionsFound > 0 ? 'seed_completed_with_transactions' : 'seed_completed_no_new',
      userId: seed.user_id,
      actionPath: '/transactions',
      iconKey: 'mail',
      i18nParams: {
        count: transactionsFound,
        totalEmails: messageIds.length,
      },
      metadata: {
        seedId,
        totalEmails: messageIds.length,
        transactionsFound,
      },
      dedupeKey: `seed-completed-${seedId}`,
      dedupeWindowMinutes: 60,
    })
  }

  console.log(`Chunk done: ${processedCount} processed, ${transactionsFound} transactions total, ${isDone ? 'COMPLETED' : `${messageIds.length - newIndex} remaining`}`)

  // Auto-invoke next chunk if not done
  if (!isDone) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    fetch(`${supabaseUrl}/functions/v1/seed-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ seedId, resume: true }),
    }).catch(err => console.error('Auto-invoke failed:', err))
  }

  return { done: isDone, processed: newIndex, transactions: transactionsFound, total: messageIds.length }
}

async function getAllMessageIds(supabase: any, tokenData: OAuthTokenRow, query: string): Promise<string[]> {
  const messageIds: string[] = []
  let pageToken: string | undefined

  while (true) {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${pageToken}` : ''}`

    const response = await fetchGmailWithRecovery(
      supabase,
      tokenData,
      url,
      { method: 'GET' },
      'seed_list_messages',
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.messages) {
      messageIds.push(...data.messages.map((msg: any) => msg.id))
    }

    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  return messageIds
}

async function processMessage(
  supabase: any,
  tokenData: OAuthTokenRow,
  messageId: string,
  userId: string,
  tokenId: string,
  userFullName?: string
): Promise<{ transactionFound: boolean }> {
  // Get message details
  const response = await fetchGmailWithRecovery(
    supabase,
    tokenData,
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { method: 'GET' },
    'seed_fetch_message',
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch message: ${response.statusText}`)
  }

  const message = await response.json()

  // Check if already processed (transactions or discarded)
  const { data: existingTransaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_oauth_token_id', tokenId)
    .eq('source_message_id', message.id || messageId)
    .maybeSingle()

  if (existingTransaction) {
    return { transactionFound: false }
  }

  const { data: existingDiscarded } = await supabase
    .from('discarded_emails')
    .select('id')
    .eq('user_oauth_token_id', tokenId)
    .eq('message_id', message.id || messageId)
    .maybeSingle()

  if (existingDiscarded) {
    return { transactionFound: false }
  }

  // Skip if not in INBOX or in SPAM/TRASH
  const labelIds = message.labelIds || []
  if (!labelIds.includes('INBOX') || labelIds.includes('SPAM') || labelIds.includes('TRASH')) {
    return { transactionFound: false }
  }

  // Extract email content
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

  // Extract attachments for AI analysis
  const currentAccessToken = tokenData.access_token || ''
  const attachmentOptions = {
    fetchAttachmentData: async (targetMessageId: string, attachmentId: string) => {
      const attachmentResponse = await fetchGmailWithRecovery(
        supabase,
        tokenData,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${targetMessageId}/attachments/${attachmentId}`,
        { method: 'GET' },
        'seed_fetch_attachment',
      )
      if (!attachmentResponse.ok) return null
      return await attachmentResponse.json()
    },
  }
  const images = await extractImageAttachments(
    currentAccessToken,
    message.id || messageId,
    message.payload,
    attachmentOptions,
  )
  const pdfTexts = await extractPdfTexts(
    currentAccessToken,
    message.id || messageId,
    message.payload,
    attachmentOptions,
  )

  const fullContent = bodyText

  // Use AI to extract transaction information (with images and PDF text if available)
  try {
    const aiResult = await extractTransactionFromEmail(fullContent, userFullName, images, pdfTexts)
    
    // Flush Langfuse events before returning (critical for serverless)
    const { flushLangfuse } = await import("../_shared/lib/langfuse.ts")
    await flushLangfuse()
    
    if (aiResult.hasTransaction) {
      const transaction = aiResult.data
      
      // Create transaction record with AI-extracted data
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId, // ← Agregar user_id explícitamente
          user_oauth_token_id: tokenId,
          source_email: fromEmail,
          source_message_id: messageId,
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
        console.error('Error saving transaction:', insertError)
        // Check if it's a duplicate
        if (insertError.code === '23505') {
          console.log('Transaction already exists (duplicate)')
          return { transactionFound: false }
        }
      } else {
        console.log(`Transaction extracted by AI: ${transaction.amount} ${transaction.currency} - ${transaction.description}`)
        return { transactionFound: true }
      }
    } else {
      // Save to discarded emails
      const { error: discardError } = await supabase
        .from('discarded_emails')
        .insert({
          user_oauth_token_id: tokenId,
          message_id: messageId,
          reason: aiResult.reason || 'No transaction detected',
        })

      if (discardError && discardError.code !== '23505') {
        console.error('Error saving discarded email:', discardError)
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
      console.log('Fallback: Creating transaction based on keywords')
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_oauth_token_id: tokenId,
          source_email: fromEmail,
          source_message_id: messageId,
          date: date,
          amount: 0,
          currency: 'USD',
          transaction_type: 'expense',
          transaction_description: subject,
          transaction_date: date.split('T')[0],
          merchant: fromEmail,
          category: 'uncategorized',
        })

      if (!insertError) {
        return { transactionFound: true }
      }
    }
  }

  return { transactionFound: false }
}

function extractBodyText(payload: any): string {
  let text = ''

  if (payload.body?.data) {
    text = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      // Prioritize text/plain
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
          // Extract basic text from HTML (remove tags)
          text = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          if (text) break
        }
      }
    }
  }

  return text
}

async function updateSeedStatus(
  supabase: any,
  seedId: string,
  status: string,
  error?: string,
  metadata?: any
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (error) {
    updateData.error_message = error
  }

  if (metadata) {
    if (metadata.totalMessages !== undefined) updateData.total_emails = metadata.totalMessages
    if (metadata.processedMessages !== undefined) updateData.emails_processed_by_ai = metadata.processedMessages
    if (metadata.transactionsFound !== undefined) updateData.transactions_found = metadata.transactionsFound
    if (metadata.skippedMessages !== undefined) updateData.total_skipped = metadata.skippedMessages
  }

  const { error: updateError } = await supabase
    .from('seeds')
    .update(updateData)
    .eq('id', seedId)

  if (updateError) {
    console.error('Error updating seed status:', updateError)
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/seed-emails' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
    --header 'Content-Type: application/json' \
    --data '{"connectionId":"your-connection-id"}'

*/
