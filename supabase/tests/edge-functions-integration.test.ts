// Integration tests for Edge Functions using Deno run

import { assertEquals, assertExists } from 'jsr:@std/assert'

// Test Edge Functions by running them with Deno
Deno.test('Edge Functions - auth-start basic test', async () => {
  // Test the auth-start function by running it directly
  const process = new Deno.Command('deno', {
    args: [
      'run',
      '--allow-net',
      '--allow-env',
      '--allow-read',
      'functions/auth-start/index.ts'
    ],
    cwd: '/Users/federicodeniard/Documents/Personal/money-tracker/supabase',
    env: {
      'SUPABASE_URL': 'http://127.0.0.1:54321',
      'SUPABASE_ANON_KEY': 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      'GOOGLE_CLIENT_ID': 'test-google-client-id',
      'GOOGLE_CLIENT_SECRET': 'test-google-client-secret',
      'OAUTH_REDIRECT_URI': 'http://localhost:3000/auth/callback',
      'FRONTEND_URL': 'http://localhost:3000'
    }
  })

  // Send a test request to the running function
  const testRequest = new Request('http://localhost:54321/functions/v1/auth-start', {
    method: 'OPTIONS',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  try {
    // Start the function
    const serverProcess = process.spawn()
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test CORS preflight
    const response = await fetch(testRequest)
    assertEquals(response.status, 200)
    
    // Clean up
    serverProcess.kill()
    
    console.log('✅ auth-start Edge Function test passed')
  } catch (error) {
    console.error('❌ auth-start Edge Function test failed:', error)
    throw error
  }
})

Deno.test('Edge Functions - seed-emails basic test', async () => {
  // Test the seed-emails function
  const process = new Deno.Command('deno', {
    args: [
      'run',
      '--allow-net',
      '--allow-env',
      '--allow-read',
      'functions/seed-emails/index.ts'
    ],
    cwd: '/Users/federicodeniard/Documents/Personal/money-tracker/supabase',
    env: {
      'SUPABASE_URL': 'http://127.0.0.1:54321',
      'SUPABASE_ANON_KEY': 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      'GOOGLE_CLIENT_ID': 'test-google-client-id',
      'GOOGLE_CLIENT_SECRET': 'test-google-client-secret',
      'OAUTH_REDIRECT_URI': 'http://localhost:3000/auth/callback',
      'FRONTEND_URL': 'http://localhost:3000',
      'XAI_API_KEY': 'test-xai-key',
      'ENCRYPTION_SECRET': 'test-encryption-secret-32-chars-long'
    }
  })

  try {
    // Start the function
    const serverProcess = process.spawn()
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test basic request
    const testRequest = new Request('http://localhost:54321/functions/v1/seed-emails', {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const response = await fetch(testRequest)
    assertEquals(response.status, 200)
    
    // Clean up
    serverProcess.kill()
    
    console.log('✅ seed-emails Edge Function test passed')
  } catch (error) {
    console.error('❌ seed-emails Edge Function test failed:', error)
    throw error
  }
})

Deno.test('Edge Functions - gmail-webhook basic test', async () => {
  // Test the gmail-webhook function
  const process = new Deno.Command('deno', {
    args: [
      'run',
      '--allow-net',
      '--allow-env',
      '--allow-read',
      'functions/gmail-webhook/index.ts'
    ],
    cwd: '/Users/federicodeniard/Documents/Personal/money-tracker/supabase',
    env: {
      'SUPABASE_URL': 'http://127.0.0.1:54321',
      'SUPABASE_ANON_KEY': 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      'GOOGLE_CLIENT_ID': 'test-google-client-id',
      'GOOGLE_CLIENT_SECRET': 'test-google-client-secret',
      'OAUTH_REDIRECT_URI': 'http://localhost:3000/auth/callback',
      'FRONTEND_URL': 'http://localhost:3000',
      'XAI_API_KEY': 'test-xai-key',
      'ENCRYPTION_SECRET': 'test-encryption-secret-32-chars-long'
    }
  })

  try {
    // Start the function
    const serverProcess = process.spawn()
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test basic request
    const testRequest = new Request('http://localhost:54321/functions/v1/gmail-webhook', {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const response = await fetch(testRequest)
    assertEquals(response.status, 200)
    
    // Clean up
    serverProcess.kill()
    
    console.log('✅ gmail-webhook Edge Function test passed')
  } catch (error) {
    console.error('❌ gmail-webhook Edge Function test failed:', error)
    throw error
  }
})
