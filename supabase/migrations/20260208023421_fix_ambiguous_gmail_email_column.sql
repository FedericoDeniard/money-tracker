-- Fix ambiguous column reference in get_active_gmail_emails
CREATE OR REPLACE FUNCTION get_active_gmail_emails()
RETURNS TABLE (gmail_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT uot.gmail_email::TEXT
  FROM user_oauth_tokens uot
  WHERE uot.user_id = auth.uid()
    AND uot.is_active = true
  ORDER BY 1;
END;
$$;