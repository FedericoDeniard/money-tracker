// Process Document Edge Function - Extract transactions from uploaded files
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { extractTransactionFromEmail } from "../_shared/ai/transaction-agent.ts"
import { extractText, getDocumentProxy } from 'npm:unpdf'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageAttachment {
  data: Uint8Array;
  mimeType: string;
  filename: string;
}

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
    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token with Supabase
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Only PDF and image files are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)

    let images: ImageAttachment[] = []
    let pdfTexts: string[] = []

    if (file.type === 'application/pdf') {
      // Process PDF
      try {
        const pdf = await getDocumentProxy(fileBytes)
        const { text } = await extractText(pdf, { mergePages: true })

        if (text && text.trim()) {
          pdfTexts.push(text)
          console.log(`Extracted PDF text: ${file.name} (${text.length} chars)`)
        } else {
          return new Response(
            JSON.stringify({ error: 'Could not extract text from PDF' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (error) {
        console.error('PDF processing error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to process PDF file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Process image - convert to ImageAttachment format
      images.push({
        data: fileBytes,
        mimeType: file.type === 'image/jpg' ? 'image/jpeg' : file.type,
        filename: file.name,
      })
      console.log(`Prepared image for AI analysis: ${file.name} (${fileBytes.length} bytes)`)
    }

    // Get user full name for AI context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let userFullName: string | undefined
    const { data: userData } = await supabase.auth.admin.getUserById(user.id)
    if (userData?.user?.user_metadata?.full_name) {
      userFullName = userData.user.user_metadata.full_name
    }

    // Analyze document with AI
    const documentContent = `Uploaded document: ${file.name}\nThis is a ${file.type === 'application/pdf' ? 'PDF document' : 'receipt/invoice image'} uploaded by the user for transaction analysis.`

    const aiResult = await extractTransactionFromEmail(documentContent, userFullName, images, pdfTexts)

    if (aiResult.hasTransaction) {
      console.log('AI successfully extracted transaction from uploaded document')

      const transaction = aiResult.data

      // Save transaction directly to database
      const { data: savedTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          source_email: 'manual-upload',  // Placeholder for manual uploads
          source_message_id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // Unique ID for manual uploads
          date: new Date().toISOString(),
          amount: transaction.amount,
          currency: transaction.currency || 'USD',
          transaction_type: transaction.type,
          transaction_description: transaction.description,
          transaction_date: transaction.date || new Date().toISOString().split('T')[0],
          merchant: transaction.merchant,
          category: transaction.category,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error saving transaction:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to save transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Return the saved transaction data
      return new Response(
        JSON.stringify({
          success: true,
          transaction: savedTransaction,
          message: 'Transaction created successfully from document'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('AI could not extract transaction from uploaded document:', aiResult.reason)

      return new Response(
        JSON.stringify({
          success: false,
          error: aiResult.reason || 'Could not extract transaction data from document'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in process-document:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
