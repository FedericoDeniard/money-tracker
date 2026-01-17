-- Create emails table to store user emails
CREATE TABLE IF NOT EXISTS emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_email VARCHAR(255) NOT NULL, -- Gmail account the email came from
    gmail_message_id VARCHAR(255) NOT NULL, -- Gmail API message ID
    
    -- Email content (what the user requested)
    subject TEXT,
    body_text TEXT, -- Plain text content
    date TIMESTAMP WITH TIME ZONE NOT NULL, -- Email date
    
    -- Processing flags
    processed BOOLEAN DEFAULT false, -- If email has been processed for transactions
    processing_error TEXT, -- Any error during processing
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate messages
    UNIQUE(user_id, gmail_email, gmail_message_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date);
CREATE INDEX IF NOT EXISTS idx_emails_processed ON emails(processed);

-- Create updated_at trigger
CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own emails
CREATE POLICY "Users can view own emails" ON emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON emails
    FOR DELETE USING (auth.uid() = user_id);
