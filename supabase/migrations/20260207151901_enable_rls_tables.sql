-- Enable RLS on key tables (transactions, user_oauth_tokens, gmail_watches) 
-- and add permissive policies for authenticated users (user_id = auth.uid()).

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_watches ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.transactions IS 'User transactions with RLS for own data access.';
COMMENT ON TABLE public.user_oauth_tokens IS 'Gmail OAuth tokens per user with RLS.';
COMMENT ON TABLE public.gmail_watches IS 'Gmail watches per user with RLS.';

-- Transactions policies (using user_oauth_token_id)
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
    ));

CREATE POLICY "transactions_insert_own" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
    ));

CREATE POLICY "transactions_update_own" ON public.transactions
    FOR UPDATE TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
    ))
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
    ));

CREATE POLICY "transactions_delete_own" ON public.transactions
    FOR DELETE TO authenticated
    USING (auth.uid() IN (
        SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
    ));

-- User OAuth Tokens policies
CREATE POLICY "user_oauth_tokens_select_own" ON public.user_oauth_tokens
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_oauth_tokens_insert_own" ON public.user_oauth_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_oauth_tokens_update_own" ON public.user_oauth_tokens
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_oauth_tokens_delete_own" ON public.user_oauth_tokens
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Gmail Watches policies
CREATE POLICY "gmail_watches_select_own" ON public.gmail_watches
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "gmail_watches_insert_own" ON public.gmail_watches
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "gmail_watches_update_own" ON public.gmail_watches
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "gmail_watches_delete_own" ON public.gmail_watches
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());