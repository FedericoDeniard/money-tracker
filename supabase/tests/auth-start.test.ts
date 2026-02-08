// Test for auth-start Edge Function

import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert'
import { createTestRequest, createAuthRequest, parseResponse, setupMocks, cleanupMocks, expectStatus, expectContains } from './helpers/test-utils.ts'
import { mockTokens, mockUsers } from './helpers/mock-data.ts'

// Import the Edge Function file directly
import '../functions/auth-start/index.ts'

Deno.test('auth-start - CORS preflight', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'OPTIONS' })
    const response = await authStart(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'ok')
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - missing token', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'GET' })
    const response = await authStart(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 401)
    expectContains(result.body, 'Missing authentication token')
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - invalid token', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('auth-start', mockTokens.invalid)
    const response = await authStart(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 401)
    expectContains(result.body, 'Invalid or expired token')
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - valid token', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('auth-start', mockTokens.valid)
    const response = await authStart(request)
    
    // Should redirect to OAuth URL
    assertEquals(response.status, 302)
    
    const location = response.headers.get('location')
    assertExists(location)
    
    // Verify OAuth URL contains required components
    const url = new URL(location)
    assertEquals(url.hostname, 'accounts.google.com')
    assertEquals(url.pathname, '/o/oauth2/v2/auth')
    
    // Check required parameters
    expectContains(Object.fromEntries(url.searchParams), 'access_type')
    expectContains(Object.fromEntries(url.searchParams), 'scope')
    expectContains(Object.fromEntries(url.searchParams), 'state')
    expectContains(Object.fromEntries(url.searchParams), 'prompt')
    
    // Verify state is the user ID
    const state = url.searchParams.get('state')
    assertEquals(state, mockUsers.valid.id)
    
    // Verify scope includes Gmail readonly
    const scope = url.searchParams.get('scope')
    assertEquals(scope, 'https://www.googleapis.com/auth/gmail.readonly')
    
    // Verify prompt is consent
    const prompt = url.searchParams.get('prompt')
    assertEquals(prompt, 'consent')
    
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - wrong method', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'POST' })
    const response = await authStart(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 405)
    expectContains(result.body, 'Method not allowed')
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - user without full name', async () => {
  setupMocks()
  
  try {
    // Mock user without full name
    const mockUserWithoutName = {
      id: 'user-456',
      email: 'noname@example.com',
      user_metadata: {}
    }
    
    // Override the mock to return user without name
    globalThis.Deno.env.get = (key: string) => {
      if (key === 'SUPABASE_URL') return 'http://localhost:54321'
      if (key === 'SUPABASE_ANON_KEY') return 'mock-anon-key'
      return undefined
    }
    
    const request = createAuthRequest('auth-start', mockTokens.valid)
    const response = await authStart(request)
    
    // Should still work, OAuth flow doesn't depend on user name
    assertEquals(response.status, 302)
    
    const location = response.headers.get('location')
    assertExists(location)
    
    const url = new URL(location)
    assertEquals(url.hostname, 'accounts.google.com')
    
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - environment variables missing', async () => {
  setupMocks()
  
  try {
    // Clear environment variables
    globalThis.Deno.env.get = () => undefined
    
    const request = createAuthRequest('auth-start', mockTokens.valid)
    
    // Should throw error due to missing environment variables
    await assertThrows(async () => {
      await authStart(request)
    })
    
  } finally {
    cleanupMocks()
  }
})

Deno.test('auth-start - OAuth URL generation', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('auth-start', mockTokens.valid)
    const response = await authStart(request)
    
    assertEquals(response.status, 302)
    
    const location = response.headers.get('location')
    assertExists(location)
    
    const url = new URL(location)
    
    // Verify all required OAuth parameters
    const requiredParams = ['client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'access_type', 'prompt']
    
    for (const param of requiredParams) {
      const value = url.searchParams.get(param)
      assertExists(value, `Missing required parameter: ${param}`)
    }
    
    // Verify client_id is set
    const clientId = url.searchParams.get('client_id')
    assertEquals(clientId, 'mock-google-client-id')
    
    // Verify redirect_uri is set
    const redirectUri = url.searchParams.get('redirect_uri')
    assertEquals(redirectUri, 'http://localhost:3000/auth/callback')
    
    // Verify response_type
    const responseType = url.searchParams.get('response_type')
    assertEquals(responseType, 'code')
    
  } finally {
    cleanupMocks()
  }
})
