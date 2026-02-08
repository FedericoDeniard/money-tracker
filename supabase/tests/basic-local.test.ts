// Basic test for local Supabase connection - no foreign keys

import { assertEquals, assertExists } from 'jsr:@std/assert'
import { createLocalSupabaseAdmin } from './helpers/test-utils.ts'

Deno.test('Local Supabase - Basic connection', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Test basic connection - query a table without foreign keys
  const { data, error } = await supabase
    .from('gmail_watches')
    .select('count')
    .limit(1)
  
  assertEquals(error, null)
  console.log('✅ Connected to local Supabase successfully')
})

Deno.test('Local Supabase - Simple insert', async () => {
  const supabase = createLocalSupabaseAdmin()
  
  // Insert test data without foreign key constraints
  const { data, error } = await supabase
    .from('gmail_watches')
    .upsert({
      user_id: '00000000-0000-0000-0000-000000000001',
      gmail_email: 'test@gmail.com',
      watch_id: 'test-watch-id',
      topic_name: 'test-topic',
      label_ids: ['INBOX'],
      expiration: new Date(Date.now() + 3600000).toISOString(),
      history_id: '12345',
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
    .from('gmail_watches')
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
    .from('gmail_watches')
    .delete()
    .eq('gmail_email', 'test@gmail.com')
  
  assertEquals(error, null)
  
  // Verify deletion
  const { data } = await supabase
    .from('gmail_watches')
    .select('*')
    .eq('gmail_email', 'test@gmail.com')
    .maybeSingle()
  
  assertEquals(data, null)
  
  console.log('✅ Test data cleaned up successfully')
})
