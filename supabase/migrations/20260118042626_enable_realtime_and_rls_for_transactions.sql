-- ============================================
-- Configuración completa de Realtime y RLS para transactions
-- ============================================

-- 1. Habilitar realtime para la tabla transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- 2. Otorgar permisos de realtime
GRANT SELECT ON transactions TO authenticated;
GRANT SELECT ON transactions TO anon;

-- 3. Configurar replica identity para realtime
ALTER TABLE transactions REPLICA IDENTITY FULL;

-- 4. Crear políticas RLS para la tabla transactions
-- Los usuarios pueden ver solo las transacciones de sus propias cuentas de Gmail

-- Policy para SELECT: usuarios pueden ver transacciones vinculadas a sus tokens OAuth
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (
  user_oauth_token_id IN (
    SELECT id FROM public.user_oauth_tokens 
    WHERE user_id = auth.uid()
  )
);

-- Policy para INSERT: usuarios pueden insertar transacciones solo en sus cuentas
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
  user_oauth_token_id IN (
    SELECT id FROM public.user_oauth_tokens 
    WHERE user_id = auth.uid()
  )
);

-- Policy para UPDATE: usuarios pueden actualizar solo sus transacciones
CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
USING (
  user_oauth_token_id IN (
    SELECT id FROM public.user_oauth_tokens 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  user_oauth_token_id IN (
    SELECT id FROM public.user_oauth_tokens 
    WHERE user_id = auth.uid()
  )
);

-- Policy para DELETE: usuarios pueden eliminar solo sus transacciones
CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
USING (
  user_oauth_token_id IN (
    SELECT id FROM public.user_oauth_tokens 
    WHERE user_id = auth.uid()
  )
);
