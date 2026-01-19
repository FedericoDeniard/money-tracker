-- ============================================
-- Tabla para emails descartados (no son transacciones)
-- Optimización: evita re-procesar emails ya analizados
-- ============================================

-- Crear tabla discarded_emails
CREATE TABLE IF NOT EXISTS discarded_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_oauth_token_id UUID NOT NULL REFERENCES user_oauth_tokens(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  reason TEXT,
  discarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un email descartado solo se registra una vez por cuenta de Gmail
  UNIQUE(user_oauth_token_id, message_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_discarded_emails_lookup 
  ON discarded_emails(user_oauth_token_id, message_id);

CREATE INDEX IF NOT EXISTS idx_discarded_emails_token 
  ON discarded_emails(user_oauth_token_id);

CREATE INDEX IF NOT EXISTS idx_discarded_emails_discarded_at 
  ON discarded_emails(discarded_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE discarded_emails ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: usuarios pueden ver solo sus propios emails descartados
CREATE POLICY "Users can view their own discarded emails"
  ON discarded_emails
  FOR SELECT
  USING (
    user_oauth_token_id IN (
      SELECT id FROM public.user_oauth_tokens 
      WHERE user_id = auth.uid()
    )
  );

-- Policy para INSERT: usuarios pueden insertar solo en sus cuentas
CREATE POLICY "Users can insert their own discarded emails"
  ON discarded_emails
  FOR INSERT
  WITH CHECK (
    user_oauth_token_id IN (
      SELECT id FROM public.user_oauth_tokens 
      WHERE user_id = auth.uid()
    )
  );

-- Policy para DELETE: usuarios pueden eliminar solo sus propios registros
CREATE POLICY "Users can delete their own discarded emails"
  ON discarded_emails
  FOR DELETE
  USING (
    user_oauth_token_id IN (
      SELECT id FROM public.user_oauth_tokens 
      WHERE user_id = auth.uid()
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE discarded_emails IS 'Stores emails that were analyzed but did not contain transactions. Prevents re-processing the same emails in future seed jobs, saving time and AI costs.';
COMMENT ON COLUMN discarded_emails.message_id IS 'Gmail message ID';
COMMENT ON COLUMN discarded_emails.reason IS 'Why the email was discarded (e.g., "No transaction found", "Promotional email", etc.)';
COMMENT ON COLUMN discarded_emails.user_oauth_token_id IS 'References the Gmail account that this email belongs to';
