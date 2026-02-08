// Test utilities for Supabase Edge Functions testing

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { mockUsers, mockTokens, mockOAuthTokens } from './mock-data.ts'

export interface TestRequest {
  method: string
  headers?: Record<string, string>
  body?: any
}

export interface TestResponse {
  status: number
  headers: Headers
  body: any
}

// Helper to create test requests
export function createTestRequest({ method, headers = {}, body }: TestRequest): Request {
  const url = 'http://localhost:54321/functions/v1/test'
  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers
  })

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  })
}

// Helper to create authenticated requests
export function createAuthRequest(functionName: string, token: string = mockTokens.valid, body?: any): Request {
  return createTestRequest({
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Function-Name': functionName
    },
    body
  })
}

// Helper to create OAuth requests
export function createOAuthRequest(functionName: string, token: string, body?: any): Request {
  return createTestRequest({
    method: 'GET',
    headers: {
      'Function-Name': functionName
    },
    body
  })
}

// Helper to parse response
export async function parseResponse(response: Response): Promise<TestResponse> {
  const body = await response.text()
  let parsedBody = body

  try {
    parsedBody = JSON.parse(body)
  } catch {
    // Keep as text if not JSON
  }

  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody
  }
}

// Helper to create real Supabase client for local testing
export function createLocalSupabaseClient() {
  return createClient(
    'http://127.0.0.1:54321',  // Supabase local URL
    'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', // Real local anon key
    {
      auth: {
        persistSession: false
      }
    }
  )
}

// Helper to create real Supabase admin client for testing
export function createLocalSupabaseAdmin() {
  return createClient(
    'http://127.0.0.1:54321',
    'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz', // Real local service role key
    {
      auth: {
        persistSession: false
      }
    }
  )
}

// Helper to setup test data in local Supabase
export async function setupTestData() {
  const supabase = createLocalSupabaseAdmin()
  
  try {
    // Create test user
    const { error: userError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Test User'
      }
    })
    
    if (userError && !userError.message.includes('already registered')) {
      console.error('Error creating test user:', userError)
    }
    
    // Create test OAuth token
    const { error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .upsert({
        user_id: 'test-user-id',
        gmail_email: 'test@gmail.com',
        access_token_encrypted: 'encrypted-access-token',
        refresh_token_encrypted: 'encrypted-refresh-token',
        token_type: 'Bearer',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        is_active: true
      })
    
    if (tokenError) {
      console.error('Error creating test token:', tokenError)
    }
    
  } catch (error) {
    console.error('Error setting up test data:', error)
  }
}

// Helper to cleanup test data
export async function cleanupTestData() {
  const supabase = createLocalSupabaseAdmin()
  
  try {
    // Delete test OAuth tokens
    await supabase
      .from('user_oauth_tokens')
      .delete()
      .eq('gmail_email', 'test@gmail.com')
    
    // Delete test transactions
    await supabase
      .from('transactions')
      .delete()
      .eq('source_email', 'test@gmail.com')
    
  } catch (error) {
    console.error('Error cleaning up test data:', error)
  }
}

// Helper to mock fetch for external APIs (Gmail, Grok) but use real Supabase
export function createMockFetch(overrides: Record<string, any> = {}) {
  return async (input: string | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.url

    // Mock Gmail API
    if (url.includes('googleapis.com/gmail')) {
      return mockGmailAPI(url)
    }

    // Mock OAuth token endpoint
    if (url.includes('oauth2.googleapis.com/token')) {
      return mockOAuthTokenAPI(init)
    }

    // Mock Grok API
    if (url.includes('api.x.ai/v1/chat/completions')) {
      return mockGrokAPI(init)
    }

    // Apply custom overrides
    for (const [pattern, response] of Object.entries(overrides)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Default: Let real requests through (for Supabase)
    return fetch(input, init)
  }
}

// Mock Gmail API responses
function mockGmailAPI(url: string): Response {
  if (url.includes('/messages/')) {
    if (url.includes('msg-123')) {
      return new Response(JSON.stringify({
        id: 'msg-123',
        threadId: 'thread-123',
        payload: {
          headers: [
            { name: 'Subject', value: 'Payment of $25.50 at Starbucks' },
            { name: 'From', value: 'receipt@starbucks.com' },
            { name: 'Date', value: 'Thu, 7 Feb 2026 14:30:00 -0300' }
          ],
          mimeType: 'text/plain',
          body: {
            data: 'WW91ciBwYXltZW50IHdhcyBzdWNjZXNzZnVsLiBBbW91bnQ6ICQyNS41MAo=' // base64 "Your payment was successful. Amount: $25.50"
          }
        },
        labelIds: ['INBOX']
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url.includes('attachments/')) {
      return new Response(JSON.stringify({
        data: 'dGVzdCBhdHRhY2htZW50IGNvbnRlbnQ=' // base64 "test attachment content"
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  if (url.includes('/messages')) {
    return new Response(JSON.stringify({
      messages: [
        { id: 'msg-123', threadId: 'thread-123' },
        { id: 'msg-456', threadId: 'thread-456' }
      ],
      nextPageToken: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Mock OAuth token API
function mockOAuthTokenAPI(init?: RequestInit): Response {
  const body = init?.body as string
  const params = new URLSearchParams(body)

  if (params.get('grant_type') === 'authorization_code') {
    return new Response(JSON.stringify({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/gmail.readonly'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (params.get('grant_type') === 'refresh_token') {
    return new Response(JSON.stringify({
      access_token: 'new-mock-access-token',
      expires_in: 3600
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'invalid_grant' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Mock Grok API
function mockGrokAPI(init?: RequestInit): Response {
  const body = init?.body as string
  const request = JSON.parse(body)

  // Simple mock: detect if content contains transaction keywords
  const content = request.messages?.[1]?.content || ''
  const hasTransaction = content.includes('$') || content.includes('payment') || content.includes('transfer')

  if (hasTransaction) {
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            hasTransaction: true,
            data: {
              amount: 25.50,
              currency: 'USD',
              type: 'expense',
              description: 'Payment at Starbucks',
              date: '2026-02-07',
              merchant: 'Starbucks',
              category: 'food'
            }
          })
        }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          hasTransaction: false,
          reason: 'No financial transaction detected'
        })
      }
    }]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Helper to setup global mocks (only for external APIs)
export function setupMocks() {
  // Mock fetch for external APIs only
  globalThis.fetch = createMockFetch()

  // Mock atob/btoa
  globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString()
  globalThis.btoa = (str: string) => Buffer.from(str).toString('base64')
}

// Helper to cleanup mocks
export function cleanupMocks() {
  // Restore original fetch
  delete (globalThis as any).fetch
  delete (globalThis as any).atob
  delete (globalThis as any).btoa
}

// Test assertion helpers
export function expectEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

export function expectStatus(response: TestResponse, expectedStatus: number, message?: string) {
  if (response.status !== expectedStatus) {
    throw new Error(message || `Expected status ${expectedStatus}, got ${response.status}`)
  }
}

export function expectContains(obj: any, key: string, message?: string) {
  if (!(key in obj)) {
    throw new Error(message || `Expected object to contain key "${key}"`)
  }
}

export function expectTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true')
  }
}

export function expectFalse(condition: boolean, message?: string) {
  if (condition) {
    throw new Error(message || 'Expected condition to be false')
  }
}
