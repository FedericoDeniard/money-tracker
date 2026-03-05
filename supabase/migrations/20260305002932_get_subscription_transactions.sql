-- Return the raw transactions belonging to a subscription candidate.
CREATE OR REPLACE FUNCTION public.get_subscription_transactions(
  p_merchant_normalized text,
  p_currency text
)
RETURNS SETOF public.transactions
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.*
  FROM public.transactions AS t
  WHERE t.user_id = auth.uid()
    AND t.transaction_type IN ('expense', 'egreso')
    AND t.amount > 0
    AND t.transaction_date IS NOT NULL
    AND t.currency = p_currency
    AND lower(
          trim(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  coalesce(t.merchant, ''),
                  '\.(com|net|org|io|co|app|ai)\b',
                  '',
                  'gi'
                ),
                '\b(inc|llc|ltd|corp|sa|srl|company)\b',
                '',
                'gi'
              ),
              '[^a-z0-9]+',
              ' ',
              'gi'
            )
          )
        ) = p_merchant_normalized
  ORDER BY t.transaction_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_transactions(text, text) TO authenticated;
