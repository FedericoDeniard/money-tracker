// Test for seed-emails Edge Function

import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert'
import { createTestRequest, createAuthRequest, parseResponse, setupMocks, cleanupMocks, expectStatus, expectContains } from './helpers/test-utils.ts'
import { mockTokens, mockUsers, mockGmailMessages, mockSeeds, mockOAuthTokens } from './helpers/mock-data.ts'

// Import the Edge Function
import seedEmails from '../functions/seed-emails/index.ts'

Deno.test('seed-emails - CORS preflight', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'OPTIONS' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'ok')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - missing token', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'POST' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 401)
    expectContains(result.body, 'Missing or invalid authorization header')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - invalid token', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('seed-emails', mockTokens.invalid, { connectionId: 'token-123' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 401)
    expectContains(result.body, 'Invalid or expired token')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - missing connection ID', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('seed-emails', mockTokens.valid, {})
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 400)
    expectContains(result.body, 'Missing connectionId')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - valid seed job creation', async () => {
  setupMocks()
  
  try {
    const request = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertExists(result.body.seedId)
    assertEquals(result.body.status, 'started')
    
    // Verify seed job was created with correct data
    const seedId = result.body.seedId
    assertExists(seedId)
    assertEquals(typeof seedId, 'string')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - token not found', async () => {
  setupMocks()
  
  try {
    // Override mock to return no token
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('supabase')) {
        return new Response(JSON.stringify({
          data: null,
          error: { message: 'Not found' }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const request = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'invalid-token' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 404)
    expectContains(result.body, 'OAuth tokens not found')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - duplicate seed job prevention', async () => {
  setupMocks()
  
  try {
    // First request
    const request1 = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response1 = await seedEmails(request1)
    const result1 = await parseResponse(response1)
    
    expectStatus(result1, 200)
    const firstSeedId = result1.body.seedId
    
    // Second request with same connection
    const request2 = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response2 = await seedEmails(request2)
    const result2 = await parseResponse(response2)
    
    expectStatus(result2, 200)
    const secondSeedId = result2.body.seedId
    
    // Should return existing seed job
    assertEquals(secondSeedId, firstSeedId)
    assertEquals(result2.body.status, 'already_processing')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - user ownership validation', async () => {
  setupMocks()
  
  try {
    // Create a token for a different user
    const otherUserToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImV4cCI6MTc1NDY0MDAwMCwiaWF0IjoxNzU0NTUzNjAwLCJ1c2VyX2lkIjoidXNlci00NTYifQ.other-signature'
    
    const request = createAuthRequest('seed-emails', otherUserToken, { connectionId: 'token-123' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 403)
    expectContains(result.body, 'You do not own this connection')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - wrong method', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${mockTokens.valid}` }
    })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 405)
    expectContains(result.body, 'Method not allowed')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - Gmail API integration', async () => {
  setupMocks()
  
  try {
    // Mock successful Gmail API responses
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('googleapis.com/gmail')) {
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
        
        if (url.includes('/messages/msg-123')) {
          return new Response(JSON.stringify(mockGmailMessages.transactionEmail), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
      
      return originalFetch(input, init)
    }
    
    const request = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertExists(result.body.seedId)
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - error handling in background processing', async () => {
  setupMocks()
  
  try {
    // Mock Gmail API to return error
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('googleapis.com/gmail')) {
        return new Response(JSON.stringify({
          error: {
            code: 403,
            message: 'Forbidden'
          }
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const request = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response = await seedEmails(request)
    const result = await parseResponse(response)
    
    // Should still create seed job, but processing will fail
    expectStatus(result, 200)
    assertExists(result.body.seedId)
    assertEquals(result.body.status, 'started')
  } finally {
    cleanupMocks()
  }
})

Deno.test('seed-emails - concurrent processing prevention', async () => {
  setupMocks()
  
  try {
    // Start first seed job
    const request1 = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response1 = await seedEmails(request1)
    const result1 = await parseResponse(response1)
    
    expectStatus(result1, 200)
    assertEquals(result1.body.status, 'started')
    
    // Try to start another seed job while first is processing
    const request2 = createAuthRequest('seed-emails', mockTokens.valid, { connectionId: 'token-123' })
    const response2 = await seedEmails(request2)
    const result2 = await parseResponse(response2)
    
    expectStatus(result2, 200)
    assertEquals(result2.body.status, 'already_processing')
    assertEquals(result2.body.seedId, result1.body.seedId)
  } finally {
    cleanupMocks()
  }
})
