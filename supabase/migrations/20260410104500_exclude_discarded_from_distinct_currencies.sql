-- Keep currency filters aligned with soft-deleted transactions.
CREATE OR REPLACE FUNCTION public.get_distinct_currencies()
RETURNS TABLE (currency text)
LANGUAGE sql
SECURITY DEFINER
IMMUTABLE
SET search_path = ''
AS $$
  SELECT DISTINCT t.currency
  FROM public.transactions AS t
  WHERE t.discarded = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_currencies() TO authenticated;
