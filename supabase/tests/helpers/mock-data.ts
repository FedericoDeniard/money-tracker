// Mock data for testing Supabase Edge Functions

export const mockUsers = {
  valid: {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'John Doe'
    }
  },
  noName: {
    id: 'user-456', 
    email: 'noname@example.com',
    user_metadata: {}
  }
}

export const mockTokens = {
  valid: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImV4cCI6MTc1NDY0MDAwMCwiaWF0IjoxNzU0NTUzNjAwLCJ1c2VyX2lkIjoidXNlci0xMjMifQ.valid-signature',
  expired: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImV4cCI6MTY1NDY0MDAwMCwiaWF0IjoxNjU0NTUzNjAwLCJ1c2VyX2lkIjoidXNlci0xMjMifQ.expired-signature',
  invalid: 'invalid-token-format',
  missing: ''
}

export const mockOAuthTokens = {
  active: {
    id: 'token-123',
    user_id: 'user-123',
    gmail_email: 'test@gmail.com',
    access_token_encrypted: 'dGVzdC1hY2Nlc3MtdG9rZW4=', // base64 "test-access-token"
    refresh_token_encrypted: 'dGVzdC1yZWZyZXNoLXRva2Vu=', // base64 "test-refresh-token"
    token_type: 'Bearer',
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    is_active: true
  },
  expired: {
    id: 'token-456',
    user_id: 'user-123',
    gmail_email: 'test@gmail.com',
    access_token_encrypted: 'ZXhwaXJlZC10b2tlbg==', // base64 "expired-token"
    refresh_token_encrypted: 'dGVzdC1yZWZyZXNoLXRva2Vu=',
    token_type: 'Bearer',
    expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    is_active: true
  }
}

export const mockGmailMessages = {
  transactionEmail: {
    id: 'msg-123',
    threadId: 'thread-123',
    payload: {
      headers: [
        { name: 'Subject', value: 'Payment of $25.50 at Starbucks' },
        { name: 'From', value: 'receipt@starbucks.com' },
        { name: 'Date', value: 'Thu, 7 Feb 2026 14:30:00 -0300' }
      ],
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: 'WW91ciBwYXltZW50IHdhcyBzdWNjZXNzZnVsLiBBbW91bnQ6ICQyNS41MAo=' // base64 "Your payment was successful. Amount: $25.50"
          }
        }
      ]
    },
    labelIds: ['INBOX']
  },
  nonTransactionEmail: {
    id: 'msg-456',
    threadId: 'thread-456', 
    payload: {
      headers: [
        { name: 'Subject', value: 'Weekly Newsletter' },
        { name: 'From', value: 'news@company.com' },
        { name: 'Date', value: 'Thu, 7 Feb 2026 10:00:00 -0300' }
      ],
      mimeType: 'text/plain',
      body: {
        data: 'VGhpcyB3ZWVrJ3MgbmV3c2xldHRlciBjb250ZW50Lg==' // base64 "This week's newsletter content."
      }
    },
    labelIds: ['INBOX']
  },
  emailWithPDF: {
    id: 'msg-789',
    threadId: 'thread-789',
    payload: {
      headers: [
        { name: 'Subject', value: 'Your Receipt #12345' },
        { name: 'From', value: 'billing@amazon.com' },
        { name: 'Date', value: 'Thu, 7 Feb 2026 16:45:00 -0300' }
      ],
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: 'VGhhbmsgeW91IGZvciB5b3VyIHB1cmNoYXNlLiBSZWNlaXB0IGF0dGFjaGVkLg==' // base64 "Thank you for your purchase. Receipt attached."
          }
        },
        {
          mimeType: 'application/pdf',
          filename: 'receipt.pdf',
          body: {
            attachmentId: 'pdf-123',
            size: 102400
          }
        }
      ]
    },
    labelIds: ['INBOX']
  },
  emailWithImage: {
    id: 'msg-999',
    threadId: 'thread-999',
    payload: {
      headers: [
        { name: 'Subject', value: 'Payment Confirmation' },
        { name: 'From', value: 'payment@bank.com' },
        { name: 'Date', value: 'Thu, 7 Feb 2026 12:15:00 -0300' }
      ],
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: 'UGF5bWVudCBjb25maXJtZWQgLSBzZWUgYXR0YWNobWVudA==' // base64 "Payment confirmed - see attachment"
          }
        },
        {
          mimeType: 'image/jpeg',
          filename: 'screenshot.jpg',
          body: {
            attachmentId: 'img-123',
            size: 204800
          }
        }
      ]
    },
    labelIds: ['INBOX']
  }
}

export const mockAttachments = {
  pdf: {
    id: 'pdf-123',
    data: 'JVBERi0xLjQKJeLjz9MKNyAwIG9iago8PC9MZW5ndGggMTAwL0ZpbHRlciAvRmxhdGVEZWNvZGU+PgpzdHJlYW0K4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWk4pWkkZW5kc3RyZWFtCmVuZG9iago=' // Mock PDF content
  },
  image: {
    id: 'img-123',
    data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==' // Mock JPEG content
  }
}

export const mockAIResponses = {
  transaction: {
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
  },
  complexTransaction: {
    hasTransaction: true,
    data: {
      amount: 15000.00,
      currency: 'ARS',
      type: 'expense',
      description: 'Transferencia bancaria',
      date: '2026-02-07',
      merchant: 'Banco Galicia',
      category: 'other'
    }
  },
  noTransaction: {
    hasTransaction: false,
    reason: 'No financial transaction detected in this email'
  },
  error: {
    error: 'AI service temporarily unavailable'
  }
}

export const mockWebhookPayload = {
  valid: {
    message: {
      data: 'eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGdtYWlsLmNvbSIsImhpc3RvcnlJZCI6IjEyMzQ1In0=', // base64 encoded Gmail notification
      messageId: 'webhook-msg-123',
      publishTime: '2026-02-07T14:30:00.000Z'
    }
  },
  invalid: {
    message: {
      // Missing data field
      messageId: 'webhook-456'
    }
  },
  malformed: {
    not: 'a webhook payload'
  }
}

export const mockSeeds = {
  pending: {
    id: 'seed-123',
    user_id: 'user-123',
    user_oauth_token_id: 'token-123',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  processing: {
    id: 'seed-456',
    user_id: 'user-123',
    user_oauth_token_id: 'token-123',
    status: 'processing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export const mockTransactions = {
  extracted: {
    id: 'txn-123',
    user_oauth_token_id: 'token-123',
    source_email: 'receipt@starbucks.com',
    source_message_id: 'msg-123',
    date: '2026-02-07T14:30:00.000Z',
    amount: 25.50,
    currency: 'USD',
    transaction_type: 'expense',
    transaction_description: 'Payment at Starbucks',
    transaction_date: '2026-02-07',
    merchant: 'Starbucks',
    category: 'food',
    created_at: new Date().toISOString()
  }
}

export const mockDiscardedEmails = {
  noTransaction: {
    id: 'discard-123',
    user_oauth_token_id: 'token-123',
    message_id: 'msg-456',
    reason: 'No financial transaction detected',
    created_at: new Date().toISOString()
  }
}
