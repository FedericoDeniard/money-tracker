-- Add health check RPC function for monitoring backend status

CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE (
    status text,
    check_timestamp timestamptz,
    version text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT 
        'ok' as status,
        now() as check_timestamp,
        'supabase-edge-functions' as version;
$$;
