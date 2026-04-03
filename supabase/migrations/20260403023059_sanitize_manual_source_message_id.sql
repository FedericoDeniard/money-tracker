-- Sanitize rows where source_message_id is empty string.
-- Assigns a unique manual ID using the same convention as the frontend and
-- the process-document edge function: manual-<epoch_ms>-<7-char hex suffix>
-- The suffix is derived from the row's UUID so it is guaranteed unique per row.
UPDATE public.transactions
SET source_message_id =
    'manual-'
    || ((extract(epoch from clock_timestamp()) * 1000)::bigint)::text
    || '-'
    || substr(md5(id::text), 1, 7)
WHERE source_message_id = '';
