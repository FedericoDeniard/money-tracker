// Health Check Edge Function - Monitor system status
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) {
    return preflightResponse
  }
  const corsHeaders = getCorsHeaders(req)

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
