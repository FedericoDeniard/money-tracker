// Simple test for local Supabase connection

import { assertEquals, assertExists } from 'jsr:@std/assert'
import { createLocalSupabaseAdmin } from './helpers/test-utils.ts'

Deno.test('Local Supabase - Simple connection', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Test basic connection
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .select('count')
    .limit(1)
  
  assertEquals(error, null)
  console.log('✅ Connected to local Supabase successfully')
})

Deno.test('Local Supabase - Insert test data', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Generate proper UUID
  const testUserId = '00000000-0000-0000-0000-000000000001'
  
  // Create user first
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User'
    })
  
  assertEquals(userError, null)
  
  // Insert test OAuth token
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .upsert({
      user_id: testUserId,
      gmail_email: 'test@gmail.com',
      access_token_encrypted: 'encrypted-access-token',
      refresh_token_encrypted: 'encrypted-refresh-token',
      token_type: 'Bearer',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      is_active: true
    })
    .select()
    .single()
  
  assertEquals(error, null)
  assertExists(data)
  assertEquals(data.gmail_email, 'test@gmail.com')
  
  console.log('✅ Test data created successfully')
})

Deno.test('Local Supabase - Query test data', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Query the test data
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('gmail_email', 'test@gmail.com')
    .single()
  
  assertEquals(error, null)
  assertExists(data)
  assertEquals(data.gmail_email, 'test@gmail.com')
  
  console.log('✅ Test data queried successfully')
})

Deno.test('Local Supabase - Cleanup test data', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Delete test data
  const { error } = await supabase
    .from('user_oauth_tokens')
    .delete()
    .eq('gmail_email', 'test@gmail.com')
  
  assertEquals(error, null)
  
  // Verify deletion
  const { data } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('gmail_email', 'test@gmail.com')
    .maybeSingle()
  
  assertEquals(data, null)
  
  console.log('✅ Test data cleaned up successfully')
})
