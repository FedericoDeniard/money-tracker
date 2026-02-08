// Test for gmail-webhook Edge Function

import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert'
import { createTestRequest, parseResponse, setupMocks, cleanupMocks, expectStatus, expectContains } from './helpers/test-utils.ts'
import { mockWebhookPayload, mockGmailMessages, mockOAuthTokens, mockAIResponses } from './helpers/mock-data.ts'

// Import the Edge Function
import gmailWebhook from '../functions/gmail-webhook/index.ts'

Deno.test('gmail-webhook - CORS preflight', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'OPTIONS' })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'ok')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - wrong method', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({ method: 'GET' })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 405)
    expectContains(result.body, 'Method not allowed')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - valid Pub/Sub message', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - invalid payload structure', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.malformed
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 400)
    expectContains(result.body, 'Invalid payload')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - missing message data', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.invalid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 400)
    expectContains(result.body, 'Invalid payload')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - no active tokens found', async () => {
  setupMocks()
  
  try {
    // Override mock to return no tokens
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('supabase')) {
        return new Response(JSON.stringify({
          data: [],
          error: null
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - message deduplication', async () => {
  setupMocks()
  
  try {
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    
    // First request
    const response1 = await gmailWebhook(request)
    const result1 = await parseResponse(response1)
    expectStatus(result1, 200)
    
    // Second request with same message
    const response2 = await gmailWebhook(request)
    const result2 = await parseResponse(response2)
    expectStatus(result2, 200)
    assertEquals(result2.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - Gmail API integration', async () => {
  setupMocks()
  
  try {
    // Mock Gmail API responses
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('googleapis.com/gmail')) {
        if (url.includes('/history')) {
          return new Response(JSON.stringify({
            history: [
              {
                messagesAdded: [
                  {
                    message: {
                      id: 'msg-123',
                      labelIds: ['INBOX']
                    }
                  }
                ]
              }
            ]
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
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - AI transaction extraction', async () => {
  setupMocks()
  
  try {
    // Mock AI response with transaction
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('api.x.ai/v1/chat/completions')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify(mockAIResponses.transaction)
            }
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.includes('googleapis.com/gmail')) {
        if (url.includes('/history')) {
          return new Response(JSON.stringify({
            history: [
              {
                messagesAdded: [
                  {
                    message: {
                      id: 'msg-123',
                      labelIds: ['INBOX']
                    }
                  }
                ]
              }
            ]
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
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - AI no transaction detected', async () => {
  setupMocks()
  
  try {
    // Mock AI response with no transaction
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('api.x.ai/v1/chat/completions')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify(mockAIResponses.noTransaction)
            }
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.includes('googleapis.com/gmail')) {
        if (url.includes('/history')) {
          return new Response(JSON.stringify({
            history: [
              {
                messagesAdded: [
                  {
                    message: {
                      id: 'msg-456',
                      labelIds: ['INBOX']
                    }
                  }
                ]
              }
            ]
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        
        if (url.includes('/messages/msg-456')) {
          return new Response(JSON.stringify(mockGmailMessages.nonTransactionEmail), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
      
      return originalFetch(input, init)
    }
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - token refresh mechanism', async () => {
  setupMocks()
  
  try {
    // Mock expired token that needs refresh
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('supabase')) {
        return new Response(JSON.stringify({
          data: [{
            ...mockOAuthTokens.expired,
            refresh_token_encrypted: 'dGVzdC1yZWZyZXNoLXRva2Vu=' // base64 "test-refresh-token"
          }],
          error: null
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({
          access_token: 'new-mock-access-token',
          expires_in: 3600
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - attachment processing', async () => {
  setupMocks()
  
  try {
    // Mock email with PDF attachment
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('googleapis.com/gmail')) {
        if (url.includes('/history')) {
          return new Response(JSON.stringify({
            history: [
              {
                messagesAdded: [
                  {
                    message: {
                      id: 'msg-789',
                      labelIds: ['INBOX']
                    }
                  }
                ]
              }
            ]
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        
        if (url.includes('/messages/msg-789')) {
          return new Response(JSON.stringify(mockGmailMessages.emailWithPDF), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        
        if (url.includes('/attachments/pdf-123')) {
          return new Response(JSON.stringify({
            data: 'dGVzdCBQREYgY29udGVudA==' // base64 "test PDF content"
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
      
      return originalFetch(input, init)
    }
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})

Deno.test('gmail-webhook - error handling', async () => {
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
    
    const request = createTestRequest({
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token' },
      body: mockWebhookPayload.valid
    })
    const response = await gmailWebhook(request)
    const result = await parseResponse(response)
    
    // Should still return OK to acknowledge receipt
    expectStatus(result, 200)
    assertEquals(result.body, 'OK')
  } finally {
    cleanupMocks()
  }
})
