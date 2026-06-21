-- Garante que a coluna user_id existe em delivery_users
-- (Caso a migration 20260621150000_delivery_users.sql não tenha sido aplicada corretamente)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.delivery_users ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Promove o usuário 895f7985-ab8b-4ee7-846b-5e2cfbffdacb como entregador

-- Cria o profile se não existir
INSERT INTO public.profiles (id, full_name, phone)
VALUES ('895f7985-ab8b-4ee7-846b-5e2cfbffdacb', 'Vendedor/Entregador', null)
ON CONFLICT (id) DO NOTHING;

-- Adiciona na tabela delivery_users
INSERT INTO public.delivery_users (user_id, name, phone, pin, active)
VALUES (
  '895f7985-ab8b-4ee7-846b-5e2cfbffdacb',
  'Vendedor/Entregador',
  null,
  '1234',
  true
)
ON CONFLICT (user_id) DO UPDATE
SET name = EXCLUDED.name,
    pin = EXCLUDED.pin,
    active = true;
