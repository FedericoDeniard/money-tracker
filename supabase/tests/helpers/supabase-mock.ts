// Mock Supabase client for testing

import { mockUsers, mockTokens, mockOAuthTokens, mockSeeds, mockTransactions, mockDiscardedEmails } from './mock-data.ts'

export class MockSupabaseClient {
  private auth: any
  private fromFn: any

  constructor(options: any = {}) {
    this.auth = {
      getUser: (token: string) => {
        if (token === mockTokens.valid) {
          return Promise.resolve({ data: { user: mockUsers.valid }, error: null })
        }
        if (token === mockTokens.expired) {
          return Promise.resolve({ data: { user: null }, error: { message: 'Token expired' } })
        }
        return Promise.resolve({ data: { user: null }, error: { message: 'Invalid token' } })
      },
      admin: {
        getUserById: (userId: string) => {
          if (userId === mockUsers.valid.id) {
            return Promise.resolve({ data: { user: mockUsers.valid }, error: null })
          }
          return Promise.resolve({ data: { user: null }, error: { message: 'User not found' } })
        }
      }
    }

    this.fromFn = this.createFromFunction()
  }

  private createFromFunction() {
    return (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => {
            if (table === 'user_oauth_tokens' && column === 'id' && value === 'token-123') {
              return Promise.resolve({ data: mockOAuthTokens.active, error: null })
            }
            if (table === 'user_oauth_tokens' && column === 'gmail_email' && value === 'test@gmail.com') {
              return Promise.resolve({ data: mockOAuthTokens.active, error: null })
            }
            if (table === 'seed_jobs' && column === 'id' && value === 'seed-123') {
              return Promise.resolve({ data: mockSeeds.pending, error: null })
            }
            return Promise.resolve({ data: null, error: { message: 'Not found' } })
          },
          maybeSingle: () => {
            if (table === 'transactions' && column === 'source_message_id') {
              return Promise.resolve({ data: null, error: null }) // No existing transaction
            }
            if (table === 'gmail_watches' && column === 'gmail_email') {
              return Promise.resolve({ data: { history_id: '12345' }, error: null })
            }
            return Promise.resolve({ data: null, error: null })
          }
        }),
        in: (column: string, values: any[]) => {
          if (table === 'user_oauth_tokens' && column === 'gmail_email') {
            return Promise.resolve({ 
              data: [mockOAuthTokens.active], 
              error: null 
            })
          }
          return Promise.resolve({ data: [], error: null })
        }
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { ...data, id: 'new-id' }, error: null })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => Promise.resolve({ data: { ...data, id: value }, error: null })
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          return Promise.resolve({ error: null })
        }
      })
    })
  }

  get auth() {
    return this.auth
  }

  from(table: string) {
    return this.fromFn(table)
  }

  rpc(functionName: string, params: any) {
    if (functionName === 'enqueue_seed_job') {
      return Promise.resolve({ data: { success: true }, error: null })
    }
    if (functionName === 'schedule_seed_processing') {
      return Promise.resolve({ data: { success: true }, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  }
}

// Mock factory functions
export function createMockSupabaseClient(options: any = {}) {
  return new MockSupabaseClient(options)
}

export function createMockSupabaseAdmin(options: any = {}) {
  return new MockSupabaseClient(options)
}

// Mock database responses
export const mockDatabaseResponses = {
  tokens: {
    active: mockOAuthTokens.active,
    expired: mockOAuthTokens.expired
  },
  seeds: {
    pending: mockSeeds.pending,
    processing: mockSeeds.processing
  },
  transactions: {
    existing: mockTransactions.extracted,
    new: mockTransactions.extracted
  },
  discarded: {
    existing: mockDiscardedEmails.noTransaction,
    new: mockDiscardedEmails.noTransaction
  }
}

// Error simulation
export class MockSupabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'MockSupabaseError'
  }
}

export const mockErrors = {
  tokenExpired: new MockSupabaseError('Token expired', 'PGRST301'),
  tokenInvalid: new MockSupabaseError('Invalid token', 'PGRST301'),
  notFound: new MockSupabaseError('Not found', 'PGRST116'),
  duplicate: new MockSupabaseError('Duplicate entry', '23505'),
  permission: new MockSupabaseError('Permission denied', '42501'),
  connection: new MockSupabaseError('Connection failed', '08006')
}

// Helper to create error responses
export function createErrorResponse(error: MockSupabaseError) {
  return Promise.resolve({ data: null, error })
}

// Helper to simulate database operations with errors
export function createErrorProneSupabase(errorType: keyof typeof mockErrors) {
  const client = new MockSupabaseClient()
  
  // Override methods to inject errors
  const originalFrom = client.from
  client.from = function(table: string) {
    const result = originalFrom.call(this, table)
    
    // Inject error on specific operations
    if (errorType === 'tokenExpired' && table === 'user_oauth_tokens') {
      return {
        ...result,
        select: () => ({
          eq: () => ({
            single: () => createErrorResponse(mockErrors.tokenExpired)
          })
        })
      }
    }
    
    if (errorType === 'duplicate' && table === 'transactions') {
      return {
        ...result,
        insert: () => createErrorResponse(mockErrors.duplicate)
      }
    }
    
    return result
  }
  
  return client
}
