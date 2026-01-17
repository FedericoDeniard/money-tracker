-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Make old token columns nullable (we use encrypted versions now)
ALTER TABLE user_oauth_tokens 
ALTER COLUMN access_token DROP NOT NULL,
ALTER COLUMN refresh_token DROP NOT NULL;

-- Add encrypted columns for tokens
ALTER TABLE user_oauth_tokens 
ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pubsub_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for users table
-- Authenticated users can only read their own data
CREATE POLICY "Users can read their own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policies for user_oauth_tokens table
-- Users can only read their own token metadata (not the encrypted tokens themselves)
CREATE POLICY "Users can read their own token metadata"
ON user_oauth_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Block INSERT, UPDATE, DELETE for authenticated users (only backend can modify)
CREATE POLICY "Block user insert to tokens"
ON user_oauth_tokens
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block user update to tokens"
ON user_oauth_tokens
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block user delete to tokens"
ON user_oauth_tokens
FOR DELETE
TO authenticated
USING (false);

-- Policies for gmail_watches table
-- Users can read their own watches
CREATE POLICY "Users can read their own watches"
ON gmail_watches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policies for pubsub_subscriptions table
-- Users can read their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
ON pubsub_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Function to encrypt text
CREATE OR REPLACE FUNCTION encrypt_text(text_to_encrypt TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(text_to_encrypt, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt text
CREATE OR REPLACE FUNCTION decrypt_text(encrypted_data BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the encryption
COMMENT ON COLUMN user_oauth_tokens.access_token_encrypted IS 'Encrypted OAuth access token using pgcrypto';
COMMENT ON COLUMN user_oauth_tokens.refresh_token_encrypted IS 'Encrypted OAuth refresh token using pgcrypto';
COMMENT ON COLUMN user_oauth_tokens.access_token IS 'DEPRECATED: Use access_token_encrypted instead';
COMMENT ON COLUMN user_oauth_tokens.refresh_token IS 'DEPRECATED: Use refresh_token_encrypted instead';
