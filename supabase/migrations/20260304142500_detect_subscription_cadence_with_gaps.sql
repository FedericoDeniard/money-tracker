-- Detect subscription cadence even with missing months between charges.
CREATE OR REPLACE FUNCTION public.get_subscription_candidates(
  p_min_occurrences integer DEFAULT 2,
  p_min_confidence numeric DEFAULT 50
)
RETURNS TABLE (
  merchant_display text,
  merchant_normalized text,
  currency text,
  avg_amount numeric,
  min_amount numeric,
  max_amount numeric,
  occurrences integer,
  interval_days_avg numeric,
  interval_stddev numeric,
  frequency text,
  last_date date,
  next_estimated_date date,
  category text,
  source_email_consistent boolean,
  confidence_score numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
WITH filtered AS (
  SELECT
    t.merchant,
    t.currency,
    t.amount::numeric AS amount,
    round(t.amount::numeric, 0) AS amount_bucket,
    t.transaction_date::date AS transaction_date,
    t.category,
    t.source_email,
    lower(
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
    ) AS merchant_normalized
  FROM public.transactions AS t
  WHERE t.user_id = auth.uid()
    AND t.transaction_type IN ('expense', 'egreso')
    AND t.amount > 0
    AND t.transaction_date IS NOT NULL
),
valid_merchants AS (
  SELECT *
  FROM filtered
  WHERE merchant_normalized <> ''
),
ordered AS (
  SELECT
    vm.*,
    lag(vm.transaction_date) OVER (
      PARTITION BY vm.merchant_normalized, vm.currency, vm.amount_bucket
      ORDER BY vm.transaction_date
    ) AS prev_date
  FROM valid_merchants AS vm
),
intervals AS (
  SELECT
    o.*,
    CASE
      WHEN o.prev_date IS NULL THEN NULL
      ELSE (o.transaction_date - o.prev_date)::numeric
    END AS interval_days
  FROM ordered AS o
),
grouped AS (
  SELECT
    min(i.merchant) AS merchant_display,
    i.merchant_normalized,
    i.currency,
    i.amount_bucket,
    avg(i.amount) AS avg_amount,
    min(i.amount) AS min_amount,
    max(i.amount) AS max_amount,
    count(*)::integer AS occurrences,
    avg(i.interval_days) FILTER (WHERE i.interval_days IS NOT NULL) AS interval_days_avg,
    stddev_pop(i.interval_days) FILTER (WHERE i.interval_days IS NOT NULL) AS interval_stddev,
    count(i.interval_days)::integer AS interval_count,
    count(*) FILTER (WHERE i.interval_days BETWEEN 25 AND 35)::integer AS monthly_interval_hits,
    count(*) FILTER (WHERE i.interval_days BETWEEN 350 AND 380)::integer AS yearly_interval_hits,
    max(i.transaction_date) AS last_date,
    mode() WITHIN GROUP (ORDER BY i.category) AS category,
    count(DISTINCT i.source_email) <= 1 AS source_email_consistent
  FROM intervals AS i
  GROUP BY i.merchant_normalized, i.currency, i.amount_bucket
  HAVING count(*) >= p_min_occurrences
),
component_scores AS (
  SELECT
    g.*,
    CASE
      WHEN g.monthly_interval_hits >= 1 THEN 'monthly'
      WHEN g.yearly_interval_hits >= 1 THEN 'yearly'
      ELSE 'unknown'
    END AS frequency,
    CASE
      WHEN g.monthly_interval_hits >= 1 THEN (g.last_date + interval '30 days')::date
      WHEN g.yearly_interval_hits >= 1 THEN (g.last_date + interval '365 days')::date
      ELSE NULL
    END AS next_estimated_date,
    -- Exponential saturation: grows fast after 2 occurrences and asymptotically approaches 1.
    (
      1::numeric - exp(
        -0.7::numeric * greatest(0::numeric, (g.occurrences - 2)::numeric)
      )::numeric
    ) AS occurrences_score,
    -- Cadence match quality based on how many observed intervals match expected cadence.
    CASE
      WHEN g.interval_count <= 0 THEN 0::numeric
      ELSE greatest(
        0::numeric,
        least(
          1::numeric,
          greatest(g.monthly_interval_hits, g.yearly_interval_hits)::numeric / g.interval_count::numeric
        )
      )
    END AS interval_score,
    greatest(
      0::numeric,
      1::numeric - least(
        1::numeric,
        coalesce((g.max_amount - g.min_amount) / nullif(g.avg_amount, 0), 1::numeric) / 0.15
      )
    ) AS amount_score,
    case when g.source_email_consistent then 1::numeric else 0::numeric end AS source_score,
    case
      when g.category in ('services', 'entertainment') then 1::numeric
      when g.category in ('education', 'health') then 0.8::numeric
      else 0.3::numeric
    end AS category_score
  FROM grouped AS g
),
scored AS (
  SELECT
    cs.*,
    round(
      least(
        100::numeric,
        greatest(
          0::numeric,
          100 * (
            0.35 * cs.occurrences_score +
            0.30 * cs.interval_score +
            0.20 * cs.amount_score +
            0.10 * cs.source_score +
            0.05 * cs.category_score
          )
        )
      ),
      2
    ) AS confidence_score
  FROM component_scores AS cs
)
SELECT
  s.merchant_display,
  s.merchant_normalized,
  s.currency,
  round(s.avg_amount, 2) AS avg_amount,
  round(s.min_amount, 2) AS min_amount,
  round(s.max_amount, 2) AS max_amount,
  s.occurrences,
  round(s.interval_days_avg, 2) AS interval_days_avg,
  round(coalesce(s.interval_stddev, 0), 2) AS interval_stddev,
  s.frequency,
  s.last_date,
  s.next_estimated_date,
  s.category,
  s.source_email_consistent,
  s.confidence_score
FROM scored AS s
WHERE s.frequency <> 'unknown'
  AND s.confidence_score >= p_min_confidence
ORDER BY s.confidence_score DESC, s.last_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_candidates(integer, numeric) TO authenticated;
