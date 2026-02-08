// Test for local Supabase connection

import { assertEquals, assertExists } from 'jsr:@std/assert'
import { createLocalSupabaseClient, createLocalSupabaseAdmin, setupTestData, cleanupTestData } from './helpers/test-utils.ts'

Deno.test('Local Supabase - Connection test', async () => {
  try {
    const supabase = createLocalSupabaseClient()
    
    // Test basic connection
    const { data, error } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .limit(1)
    
    assertExists(data)
    assertEquals(error, null)
    
    console.log('✅ Connected to local Supabase successfully')
  } catch (error) {
    console.error('❌ Failed to connect to local Supabase:', error)
    throw error
  }
})

Deno.test('Local Supabase - Setup test data', async () => {
  try {
    await setupTestData()
    console.log('✅ Test data setup completed')
    
    // Verify data was created
    const supabase = createLocalSupabaseAdmin()
    const { data: tokens, error } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('gmail_email', 'test@gmail.com')
      .single()
    
    assertExists(tokens)
    assertEquals(error, null)
    assertEquals(tokens.gmail_email, 'test@gmail.com')
    
    console.log('✅ Test data verified in local Supabase')
  } catch (error) {
    console.error('❌ Failed to setup test data:', error)
    throw error
  }
})

Deno.test('Local Supabase - Cleanup test data', async () => {
  try {
    await cleanupTestData()
    console.log('✅ Test data cleanup completed')
    
    // Verify data was deleted
    const supabase = createLocalSupabaseAdmin()
    const { data: tokens, error } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('gmail_email', 'test@gmail.com')
      .maybeSingle()
    
    assertEquals(tokens, null)
    assertEquals(error, null)
    
    console.log('✅ Test data cleanup verified')
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error)
    throw error
  }
})
