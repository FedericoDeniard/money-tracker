-- Gmail RPCs: secure functions for authenticated users (SECURITY INVOKER, search_path='').

CREATE OR REPLACE FUNCTION public.stop_all_watches_for_user()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Stop all Gmail watches for current user
  UPDATE public.gmail_watches
  SET active = false
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_gmail_connection(token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Delete specific OAuth token if owned by user
  DELETE FROM public.user_oauth_tokens
  WHERE id = delete_gmail_connection.token_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_watches_for_user()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Renew/activate watches for current user (update expires or logic)
  UPDATE public.gmail_watches
  SET expires_at = now() + interval '7 days',
      active = true
  WHERE user_id = auth.uid() AND expires_at < now();
END;
$$;

-- Existing frontend RPCs
CREATE OR REPLACE FUNCTION public.get_active_gmail_emails()
RETURNS TABLE (gmail_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT gmail_email
  FROM public.user_oauth_tokens
  WHERE is_active = true;
END;
$$;

-- Add if needed: get_distinct_currencies()
CREATE OR REPLACE FUNCTION public.get_distinct_currencies()
RETURNS TABLE (currency text)
LANGUAGE sql
SECURITY DEFINER
IMMUTABLE
SET search_path = ''
AS $$
  SELECT DISTINCT currency FROM public.transactions;
$$;