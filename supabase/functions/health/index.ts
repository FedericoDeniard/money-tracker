// Health Check Edge Function - Monitor system status
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Basic health check
    const healthData = {
      status: 'ok',
      check_timestamp: new Date().toISOString(),
      version: 'supabase-edge-functions',
      service: 'money-tracker-backend',
      environment: Deno.env.get('ENVIRONMENT') || 'development'
    }

    return new Response(
      JSON.stringify(healthData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({ 
        status: 'error',
        check_timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
