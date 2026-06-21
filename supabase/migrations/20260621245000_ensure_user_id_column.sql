-- Garante que a coluna user_id existe em delivery_users
-- (Caso a migration 20260621150000_delivery_users.sql não tenha sido aplicada corretamente)
-- Primeiro adiciona a coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.delivery_users ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
