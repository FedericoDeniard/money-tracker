-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255), -- Redundant but useful for queries (auth.users has it too)
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_oauth_tokens table for Gmail API tokens
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    gmail_email VARCHAR(255), -- Gmail address associated with tokens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gmail_email)
);

-- Create gmail_watches table for active Gmail API watches
CREATE TABLE IF NOT EXISTS gmail_watches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_email VARCHAR(255) NOT NULL,
    watch_id VARCHAR(255) UNIQUE, -- Gmail API watch ID
    topic_name VARCHAR(255) NOT NULL, -- Pub/Sub topic name
    label_ids TEXT[], -- Labels being watched (e.g., ['INBOX'])
    expiration TIMESTAMP WITH TIME ZONE,
    history_id VARCHAR(255), -- Last processed history ID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gmail_email)
);

-- Create pubsub_subscriptions table for Pub/Sub subscriptions
CREATE TABLE IF NOT EXISTS pubsub_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_name VARCHAR(255) UNIQUE NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    push_endpoint TEXT NOT NULL, -- Webhook URL
    ack_deadline_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_id ON user_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_watches_user_id ON gmail_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_pubsub_subscriptions_user_id ON pubsub_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_watches_watch_id ON gmail_watches(watch_id);
CREATE INDEX IF NOT EXISTS idx_pubsub_subscriptions_subscription_name ON pubsub_subscriptions(subscription_name);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_oauth_tokens_updated_at BEFORE UPDATE ON user_oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmail_watches_updated_at BEFORE UPDATE ON gmail_watches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pubsub_subscriptions_updated_at BEFORE UPDATE ON pubsub_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create user record when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();