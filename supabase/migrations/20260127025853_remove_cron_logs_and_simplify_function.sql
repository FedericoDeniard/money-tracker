-- Eliminar tabla de logs y simplificar función de renovación

-- Eliminar tabla de logs
DROP TABLE IF EXISTS cron_job_logs;

-- Simplificar función sin logs
CREATE OR REPLACE FUNCTION renew_gmail_watches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backend_url text := 'https://backend-production-74b9.up.railway.app/renew-watches';
BEGIN
  -- Hacer HTTP request al endpoint de renovación
  PERFORM net.http_post(
    url := backend_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', 'renew_all')
  );
  
  RAISE LOG 'Gmail watches renewal triggered at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error triggering Gmail watches renewal: %', SQLERRM;
END;
$$;