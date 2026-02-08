# Real Testing Suite Implementation

Convert all tests from mocks to real Supabase local and real API calls for comprehensive end-to-end testing.

## Current State Analysis

**Mock-based Tests:**
- AI tests use mockGrokAPI() with keyword detection
- Gmail tests use mockGmailAPI() with fixed responses  
- OAuth tests use mockOAuthTokenAPI()
- Only Supabase local connection is real

**Required Changes:**
1. Remove all API mocks (Gmail, Grok, OAuth)
2. Setup real API credentials and services
3. Create real test data in local Supabase
4. Handle real API rate limits and errors
5. Update test expectations for real responses

## Implementation Plan

### Phase 1: Environment Setup
- Configure real API keys (XAI, Google OAuth)
- Setup real Gmail test account
- Create test data seeds for local Supabase
- Update test helpers to remove mocks

### Phase 2: AI Tests with Real Grok
- Replace mockGrokAPI with real fetch calls
- Setup real XAI_API_KEY environment variable
- Update test expectations for AI responses
- Handle rate limits and API errors
- Add retry logic for failed API calls

### Phase 3: Gmail API Integration
- Replace mockGmailAPI with real Gmail API calls
- Setup OAuth flow for test Gmail account
- Create real test emails with attachments
- Handle Gmail API quotas and rate limits
- Test real email parsing and attachment extraction

### Phase 4: OAuth Flow Tests
- Replace mockOAuthTokenAPI with real Google OAuth
- Setup test Google OAuth credentials
- Test real token exchange and refresh
- Handle OAuth errors and edge cases

### Phase 5: Edge Functions Integration
- Fix Edge Function import/export issues
- Create real test requests to running functions
- Test complete end-to-end flows
- Validate real database operations

### Phase 6: Test Data Management
- Create comprehensive test data seeds
- Setup proper cleanup between tests
- Handle foreign key constraints correctly
- Create realistic test scenarios

## Technical Requirements

**Environment Variables Needed:**
- XAI_API_KEY (real Grok API key)
- GOOGLE_CLIENT_ID (real OAuth client)
- GOOGLE_CLIENT_SECRET (real OAuth secret)
- TEST_GMAIL_ACCOUNT (real Gmail for testing)
- TEST_GMAIL_PASSWORD (app password for Gmail)

**Test Data Requirements:**
- Real user records in auth.users
- Valid OAuth tokens in user_oauth_tokens
- Test emails in Gmail account
- Transaction records with proper relationships

**Performance Considerations:**
- API rate limits (Gmail: 250 units/second, Grok: unknown)
- Test execution time (real APIs vs 2ms mocks)
- Cost management (API calls cost money)
- Parallel test execution conflicts

## Risk Mitigation

**API Costs:**
- Limit test frequency
- Use test-specific API keys with quotas
- Monitor API usage during development

**Data Privacy:**
- Use dedicated test accounts
- Never use production data
- Clean up test data properly

**Test Reliability:**
- Add retry logic for flaky APIs
- Handle network timeouts gracefully
- Create fallback test scenarios

## Success Criteria

- All tests pass with real APIs
- Tests complete within reasonable time (<30s per test)
- No test data pollution between runs
- Comprehensive error coverage
- Realistic test scenarios

## Implementation Order

1. Environment setup and credentials
2. AI tests with real Grok (easiest first)
3. Gmail API integration
4. OAuth flow tests
5. Edge Functions end-to-end
6. Test data management and cleanup
