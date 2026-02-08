-- Function to get distinct currencies for the current user
CREATE OR REPLACE FUNCTION get_distinct_currencies()
RETURNS TABLE (currency TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.currency::TEXT
  FROM transactions t
  WHERE t.user_id = auth.uid()
  ORDER BY t.currency;
END;
$$;

-- Function to get active Gmail emails for the current user
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
  ORDER BY uot.gmail_email;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_distinct_currencies() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_gmail_emails() TO authenticated;
