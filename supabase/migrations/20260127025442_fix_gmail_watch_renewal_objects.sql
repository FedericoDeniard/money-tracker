-- Migración de reparación: Crear objetos faltantes para renovación de Gmail watches
-- Esta migración repara los objetos que deberían haberse creado en 20260127023727_add_pg_cron_and_gmail_watch_renewal.sql

-- Crear tabla para logs de cron jobs
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id serial PRIMARY KEY,
  job_name text NOT NULL,
  executed_at timestamp DEFAULT NOW(),
  status text,
  details text
);

-- Crear función para renovar Gmail watches
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
  
  -- Log de ejecución
  INSERT INTO cron_job_logs (job_name, status, details) 
  VALUES ('renew-gmail-watches', 'executed', 'Gmail watches renewal triggered');
  
  RAISE LOG 'Gmail watches renewal triggered at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    -- Log de error
    INSERT INTO cron_job_logs (job_name, status, details) 
    VALUES ('renew-gmail-watches', 'error', SQLERRM);
    
    RAISE LOG 'Error triggering Gmail watches renewal: %', SQLERRM;
END;
$$;

-- Programar el cron para que se ejecute todos los días a las 2 AM UTC
-- Solo si no existe ya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'renew-gmail-watches'
  ) THEN
    PERFORM cron.schedule(
      'renew-gmail-watches',
      '0 2 * * *',
      'SELECT renew_gmail_watches()'
    );
    
    -- Log inicial
    INSERT INTO cron_job_logs (job_name, status, details) 
    VALUES ('renew-gmail-watches', 'scheduled', 'Gmail watches renewal job scheduled successfully');
  END IF;
END $$;