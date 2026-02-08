// Seed Emails Edge Function - Processes historical emails for transactions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { extractTransactionFromEmail } from '../_shared/ai/transaction-agent'
import { extractPdfAttachments } from '../_shared/lib/pdf-extractor'
import { extractImageAttachments } from '../_shared/lib/image-extractor'
import { decryptTokenFallback, encryptTokenFallback } from '../_shared/lib/encryption'
import { createSupabaseClient } from '../_shared/lib/supabase'
import { google } from 'npm:googleapis@170.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SeedRequest {
  connectionId: string
}

const MAX_RETRIES = 3
const MONTHS_TO_SEED = 3

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
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token with Supabase
    const supabase = createSupabaseClient()

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id

    // Parse request body
    const { connectionId }: SeedRequest = await req.json()

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify that the connection belongs to the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('id, gmail_email')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Connection not found or unauthorized' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if there's already a seed in progress for this connection
    const { data: existingSeed } = await supabase
      .from('seeds')
      .select('id, status')
      .eq('user_oauth_token_id', connectionId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingSeed) {
      return new Response(
        JSON.stringify({
          error: 'A seed is already in progress for this connection',
          seedId: existingSeed.id
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create seed
    const { data: newSeed, error: seedError } = await supabase
      .from('seeds')
      .insert({
        user_id: userId,
        user_oauth_token_id: connectionId,
        status: 'pending',
      })
      .select()
      .single()

    if (seedError || !newSeed) {
      console.error('Error creating seed:', seedError)
      return new Response(
        JSON.stringify({ error: 'Failed to create seed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Seed created', {
      seedId: newSeed.id,
      userId,
      gmailEmail: tokenData.gmail_email
    })

    // Start processing in background (don't await)
    // In Edge Functions, we'll process synchronously for now
    // TODO: Implement proper background processing
    processSeedJob(newSeed.id).catch(error => {
      console.error('Error in seed job', { error, seedId: newSeed.id })
    })

    return new Response(
      JSON.stringify({
        seedId: newSeed.id,
        status: 'pending',
        message: 'Seed started successfully'
      }),
      { 
        status: 202, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error starting seed:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processSeedJob(seedId: string): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // Get seed data
    const { data: seed, error: seedError } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', seedId)
      .single()

    if (seedError || !seed) {
      throw new Error(`Seed not found: ${seedId}`)
    }

    // Get user OAuth tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('id', seed.user_oauth_token_id)
      .single()

    if (tokenError || !tokenData) {
      throw new Error('OAuth tokens not found')
    }

    // Decrypt tokens
    const accessToken = await decryptTokenFallback(tokenData.access_token_encrypted)
    const refreshToken = tokenData.refresh_token_encrypted
      ? await decryptTokenFallback(tokenData.refresh_token_encrypted)
      : null

    // Get user full name for context
    let userFullName: string | undefined
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      seed.user_id
    )
    if (!userError && userData?.user?.user_metadata?.full_name) {
      userFullName = userData.user.user_metadata.full_name
    }

    // Calculate date 3 months ago
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - MONTHS_TO_SEED)
    const afterDate = threeMonthsAgo.toISOString().split('T')[0]?.replace(/-/g, '/') || ''
    const query = `after:${afterDate}`

    // Get all message IDs using Gmail API
    const messageIds = await getAllMessageIds(accessToken, query)

    if (messageIds.length === 0) {
      await updateSeedStatus(supabase, seedId, 'completed', undefined, {
        totalMessages: 0,
        processedMessages: 0,
        transactionsFound: 0,
      })
      return
    }

    console.log(`Found ${messageIds.length} messages to process`)

    // Process messages in batches
    const batchSize = 10
    let processedCount = 0
    let transactionsFound = 0

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize)
      
      for (const messageId of batch) {
        try {
          const result = await processMessage(
            supabase, 
            accessToken, 
            messageId, 
            seed.user_id, 
            tokenData.id,
            userFullName
          )
          
          if (result.transactionFound) {
            transactionsFound++
          }
          
          processedCount++
        } catch (error) {
          console.error(`Error processing message ${messageId}:`, error)
        }
      }

      // Update progress
      if (processedCount % 50 === 0) {
        await updateSeedStatus(supabase, seedId, 'processing', undefined, {
          totalMessages: messageIds.length,
          processedMessages: processedCount,
          transactionsFound,
        })
      }
    }

    // Mark as completed
    await updateSeedStatus(supabase, seedId, 'completed', undefined, {
      totalMessages: messageIds.length,
      processedMessages: processedCount,
      transactionsFound,
    })

    console.log(`Seed completed: ${processedCount} messages processed, ${transactionsFound} transactions found`)

  } catch (error) {
    console.error('Seed job failed:', error)
    await updateSeedStatus(
      supabase, 
      seedId, 
      'failed', 
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

async function getAllMessageIds(accessToken: string, query: string): Promise<string[]> {
  const messageIds: string[] = []
  let pageToken: string | undefined

  while (true) {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${pageToken}` : ''}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

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
  accessToken: string,
  messageId: string,
  userId: string,
  tokenId: string,
  userFullName?: string
): Promise<{ transactionFound: boolean }> {
  // Get message details
  const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch message: ${response.statusText}`)
  }

  const message = await response.json()

  // Check if already processed
  const { data: existingTransaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('source_message_id', messageId)
    .maybeSingle()

  if (existingTransaction) {
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

  // Combine all content sources for AI analysis
  const contentParts = [bodyText]

  // Process PDF attachments
  try {
    const gmailClient = new google.gmail_v1.Gmail({ 
      auth: { 
        bearer: accessToken 
      } 
    })
    const pdfTexts = await extractPdfAttachments(gmailClient, messageId)
    if (pdfTexts.length > 0) {
      contentParts.push('--- PDF ATTACHMENT ---')
      contentParts.push(...pdfTexts)
    }
  } catch (error) {
    console.warn('Error processing PDF attachments:', error)
  }

  // Process image attachments
  try {
    const gmailClient = new google.gmail_v1.Gmail({ 
      auth: { 
        bearer: accessToken 
      } 
    })
    const imageTexts = await extractImageAttachments(gmailClient, messageId)
    if (imageTexts.length > 0) {
      contentParts.push('--- IMAGE ATTACHMENT (OCR) ---')
      contentParts.push(...imageTexts)
    }
  } catch (error) {
    console.warn('Error processing image attachments:', error)
  }

  const fullContent = contentParts.filter(t => t.trim()).join('\n\n')

  // Use AI to extract transaction information
  try {
    const aiResult = await extractTransactionFromEmail(fullContent, userFullName)
    
    if (aiResult.hasTransaction) {
      const transaction = aiResult.data
      
      // Create transaction record with AI-extracted data
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
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
    const transactionKeywords = ['purchase', 'payment', 'charge', 'debit', 'credit', 'invoice', 'receipt']
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
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const plainText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        if (plainText.trim()) {
          text = plainText
          break
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
    updateData.error = error
  }

  if (metadata) {
    updateData.metadata = metadata
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
