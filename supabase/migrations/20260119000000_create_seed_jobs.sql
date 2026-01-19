-- ============================================
-- Tabla simple para tracking de estado de seeds
-- ============================================

-- Crear tabla seeds para saber si hay un seed en progreso
CREATE TABLE IF NOT EXISTS seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_oauth_token_id UUID NOT NULL REFERENCES user_oauth_tokens(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único parcial: solo un seed pending por cuenta de Gmail a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_seeds_one_pending_per_account 
  ON seeds(user_oauth_token_id) 
  WHERE status = 'pending';

-- Índices
CREATE INDEX IF NOT EXISTS idx_seeds_user_id ON seeds(user_id);
CREATE INDEX IF NOT EXISTS idx_seeds_status ON seeds(status);
CREATE INDEX IF NOT EXISTS idx_seeds_user_oauth_token_id ON seeds(user_oauth_token_id);

-- Trigger para updated_at
CREATE TRIGGER update_seeds_updated_at 
  BEFORE UPDATE ON seeds 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seeds"
  ON seeds FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own seeds"
  ON seeds FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own seeds"
  ON seeds FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own seeds"
  ON seeds FOR DELETE
  USING (user_id = auth.uid());

-- Comentarios
COMMENT ON TABLE seeds IS 'Simple tracking of seed status to prevent duplicate seeds';
COMMENT ON COLUMN seeds.status IS 'Seed status: pending (in progress), completed, or failed';
