// Test for AI transaction extraction

import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert'
import { setupMocks, cleanupMocks } from '../helpers/test-utils.ts'
import { mockAIResponses } from '../helpers/mock-data.ts'

// Import the AI function
import { extractTransactionFromEmail } from '../../functions/_shared/ai/transaction-agent.ts'

Deno.test('AI - successful transaction extraction', async () => {
  setupMocks()
  
  try {
    // Mock Deno.env.get for this test
    const originalEnvGet = globalThis.Deno?.env?.get
    if (globalThis.Deno) {
      globalThis.Deno.env = {
        get: (key: string) => {
          if (key === 'XAI_API_KEY') return 'mock-xai-key'
          return undefined
        }
      }
    }
    
    const emailContent = 'Payment of $25.50 at Starbucks for coffee'
    const result = await extractTransactionFromEmail(emailContent, 'John Doe')
    
    assertExists(result)
    assertEquals(result.hasTransaction, true)
    if (result.hasTransaction) {
      assertExists(result.data)
      assertEquals(result.data.amount, 25.50)
      assertEquals(result.data.currency, 'USD')
      assertEquals(result.data.type, 'expense')
      assertEquals(result.data.merchant, 'Starbucks')
      assertEquals(result.data.category, 'food')
    }
    
    // Restore original env.get
    if (globalThis.Deno && originalEnvGet) {
      globalThis.Deno.env.get = originalEnvGet
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - no transaction detected', async () => {
  setupMocks()
  
  try {
    const emailContent = 'This is just a regular newsletter with no financial information'
    const result = await extractTransactionFromEmail(emailContent)
    
    assertExists(result)
    assertEquals(result.hasTransaction, false)
    if (!result.hasTransaction) {
      assertExists(result.reason)
      assertEquals(result.reason, 'No financial transaction detected')
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - user context improves classification', async () => {
  setupMocks()
  
  try {
    const emailContent = 'John Doe sent $100 to Jane Doe for rent payment'
    const result = await extractTransactionFromEmail(emailContent, 'John Doe')
    
    assertExists(result)
    assertEquals(result.hasTransaction, true)
    // With user context, should classify as expense (John sent money)
    if (result.hasTransaction) {
      assertEquals(result.data.type, 'expense')
      assertEquals(result.data.merchant, 'Jane Doe')
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - complex transaction with multiple currencies', async () => {
  setupMocks()
  
  try {
    const emailContent = 'Transferencia de $15.000 ARS realizada desde cuenta de John Doe'
    const result = await extractTransactionFromEmail(emailContent, 'John Doe')
    
    assertExists(result)
    assertEquals(result.hasTransaction, true)
    if (result.hasTransaction) {
      assertEquals(result.data.currency, 'ARS')
      assertEquals(result.data.amount, 15000.00)
      assertEquals(result.data.type, 'expense')
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - handles malformed AI response', async () => {
  setupMocks()
  
  try {
    // Mock AI to return invalid JSON
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('api.x.ai/v1/chat/completions')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: 'invalid json response'
            }
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const emailContent = 'Payment of $25.50 at Starbucks'
    const result = await extractTransactionFromEmail(emailContent)
    
    assertExists(result)
    assertEquals(result.hasTransaction, false)
    if (!result.hasTransaction) {
      assertEquals(result.reason, 'Invalid JSON from AI')
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - handles AI service error', async () => {
  setupMocks()
  
  try {
    // Mock AI to return error
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      
      if (url.includes('api.x.ai/v1/chat/completions')) {
        return new Response(JSON.stringify({
          error: 'Service temporarily unavailable'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return originalFetch(input, init)
    }
    
    const emailContent = 'Payment of $25.50 at Starbucks'
    
    await assertThrows(async () => {
      await extractTransactionFromEmail(emailContent)
    })
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - empty email content', async () => {
  setupMocks()
  
  try {
    const emailContent = ''
    const result = await extractTransactionFromEmail(emailContent)
    
    assertExists(result)
    assertEquals(result.hasTransaction, false)
    assertExists(result.reason)
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - very long email content', async () => {
  setupMocks()
  
  try {
    const emailContent = 'Payment of $25.50 at Starbucks. '.repeat(1000) // Very long content
    const result = await extractTransactionFromEmail(emailContent)
    
    assertExists(result)
    assertEquals(result.hasTransaction, true)
    assertExists(result.data)
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - special characters and encoding', async () => {
  setupMocks()
  
  try {
    const emailContent = 'Pago de €50,50 en café con leche y medialunas'
    const result = await extractTransactionFromEmail(emailContent)
    
    assertExists(result)
    assertEquals(result.hasTransaction, true)
    if (result.hasTransaction) {
      assertEquals(result.data.currency, 'EUR')
      assertEquals(result.data.amount, 50.50)
    }
  } finally {
    cleanupMocks()
  }
})

Deno.test('AI - income vs expense detection', async () => {
  setupMocks()
  
  try {
    // Test income (money received)
    const incomeEmail = 'John Doe received $500 salary payment'
    const incomeResult = await extractTransactionFromEmail(incomeEmail, 'John Doe')
    
    assertExists(incomeResult)
    assertEquals(incomeResult.hasTransaction, true)
    if (incomeResult.hasTransaction) {
      assertEquals(incomeResult.data.type, 'income')
    }
    
    // Test expense (money sent)
    const expenseEmail = 'John Doe paid $100 for rent'
    const expenseResult = await extractTransactionFromEmail(expenseEmail, 'John Doe')
    
    assertExists(expenseResult)
    assertEquals(expenseResult.hasTransaction, true)
    if (expenseResult.hasTransaction) {
      assertEquals(expenseResult.data.type, 'expense')
    }
  } finally {
    cleanupMocks()
  }
})
