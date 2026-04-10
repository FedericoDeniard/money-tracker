-- Soft delete support for transactions and traceability link from discarded_emails.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS discarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS discarded_reason text;

ALTER TABLE public.discarded_emails
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discarded_emails_transaction_id_fkey'
  ) THEN
    ALTER TABLE public.discarded_emails
      ADD CONSTRAINT discarded_emails_transaction_id_fkey
      FOREIGN KEY (transaction_id)
      REFERENCES public.transactions(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_transactions_user_discarded_created_at
  ON public.transactions(user_id, discarded, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discarded_emails_transaction_id
  ON public.discarded_emails(transaction_id);
