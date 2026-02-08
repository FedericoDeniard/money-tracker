// Test for encryption utilities

import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert'
import { setupMocks, cleanupMocks } from '../helpers/test-utils.ts'

// Import the encryption functions
import { encryptToken, decryptToken, encryptTokenFallback, decryptTokenFallback } from '../../functions/_shared/lib/encryption.ts'

Deno.test('Encryption - round-trip with proper encryption', async () => {
  // Set environment variable for encryption
  const originalSecret = Deno.env.get('ENCRYPTION_SECRET')
  Deno.env.set('ENCRYPTION_SECRET', 'test-encryption-secret-32-chars-long')
  
  setupMocks()
  
  try {
    const originalToken = 'test-access-token-12345'
    
    const encrypted = await encryptToken(originalToken)
    assertExists(encrypted)
    assertEquals(typeof encrypted, 'string')
    assertExists(encrypted.length > 0)
    
    const decrypted = await decryptToken(encrypted)
    assertEquals(decrypted, originalToken)
    
    console.log('✅ Encryption round-trip test passed')
  } finally {
    // Restore original environment variable
    if (originalSecret) {
      Deno.env.set('ENCRYPTION_SECRET', originalSecret)
    } else {
      Deno.env.delete('ENCRYPTION_SECRET')
    }
    cleanupMocks()
  }
})

Deno.test('Encryption - fallback round-trip', async () => {
  setupMocks()
  
  try {
    const originalToken = 'test-access-token-12345'
    
    const encrypted = await encryptTokenFallback(originalToken)
    assertExists(encrypted)
    assertEquals(typeof encrypted, 'string')
    
    const decrypted = await decryptTokenFallback(encrypted)
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - different tokens produce different encrypted values', async () => {
  setupMocks()
  
  try {
    const token1 = 'token-1'
    const token2 = 'token-2'
    
    const encrypted1 = await encryptToken(token1)
    const encrypted2 = await encryptToken(token2)
    
    // Should be different
    assertExists(encrypted1 !== encrypted2)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - same token produces different encrypted values (nonce)', async () => {
  setupMocks()
  
  try {
    const token = 'same-token'
    
    const encrypted1 = await encryptToken(token)
    const encrypted2 = await encryptToken(token)
    
    // Should be different due to random nonce
    assertExists(encrypted1 !== encrypted2)
    
    // But both decrypt to the same original
    const decrypted1 = await decryptToken(encrypted1)
    const decrypted2 = await decryptToken(encrypted2)
    
    assertEquals(decrypted1, token)
    assertEquals(decrypted2, token)
    assertEquals(decrypted1, decrypted2)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - empty token', async () => {
  setupMocks()
  
  try {
    const originalToken = ''
    
    const encrypted = await encryptToken(originalToken)
    const decrypted = await decryptToken(encrypted)
    
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - long token', async () => {
  setupMocks()
  
  try {
    const originalToken = 'a'.repeat(1000) // 1000 character token
    
    const encrypted = await encryptToken(originalToken)
    const decrypted = await decryptToken(encrypted)
    
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - special characters', async () => {
  setupMocks()
  
  try {
    const originalToken = 'token-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const encrypted = await encryptToken(originalToken)
    const decrypted = await decryptToken(encrypted)
    
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - invalid encrypted data', async () => {
  setupMocks()
  
  try {
    const invalidEncrypted = 'invalid-encrypted-data'
    
    await assertThrows(async () => {
      await decryptToken(invalidEncrypted)
    })
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - missing environment variable', async () => {
  setupMocks()
  
  try {
    // Clear the encryption secret
    globalThis.Deno.env.get = () => undefined
    
    await assertThrows(async () => {
      await encryptToken('test-token')
    })
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - base64 fallback when encryption fails', async () => {
  setupMocks()
  
  try {
    // Clear encryption secret to trigger fallback
    globalThis.Deno.env.get = (key: string) => {
      if (key === 'ENCRYPTION_SECRET') return undefined
      return 'mock-value'
    }
    
    const originalToken = 'test-token'
    
    const encrypted = await encryptTokenFallback(originalToken)
    // Should be base64 encoded
    assertEquals(encrypted, btoa(originalToken))
    
    const decrypted = await decryptTokenFallback(encrypted)
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - base64 fallback round-trip', async () => {
  setupMocks()
  
  try {
    const originalToken = 'test-token-with-special-chars-!@#$%'
    
    const encrypted = await encryptTokenFallback(originalToken)
    const decrypted = await decryptTokenFallback(encrypted)
    
    assertEquals(decrypted, originalToken)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - decryptTokenFallback handles non-base64', async () => {
  setupMocks()
  
  try {
    // Clear encryption secret to trigger fallback
    globalThis.Deno.env.get = (key: string) => {
      if (key === 'ENCRYPTION_SECRET') return undefined
      return 'mock-value'
    }
    
    const nonBase64Data = 'not-base64-data-@#$%'
    
    const decrypted = await decryptTokenFallback(nonBase64Data)
    // Should return the original string when base64 decode fails
    assertEquals(decrypted, nonBase64Data)
  } finally {
    cleanupMocks()
  }
})

Deno.test('Encryption - performance with large tokens', async () => {
  setupMocks()
  
  try {
    const largeToken = 'x'.repeat(10000) // 10KB token
    
    const start = Date.now()
    const encrypted = await encryptToken(largeToken)
    const decrypted = await decryptToken(encrypted)
    const end = Date.now()
    
    assertEquals(decrypted, largeToken)
    
    // Should complete in reasonable time (< 1 second)
    assertExists(end - start < 1000)
  } finally {
    cleanupMocks()
  }
})
