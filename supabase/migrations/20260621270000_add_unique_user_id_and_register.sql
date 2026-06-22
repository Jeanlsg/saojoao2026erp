-- Garante que user_id tem constraint UNIQUE em delivery_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_users_user_id_key'
  ) THEN
    ALTER TABLE public.delivery_users ADD CONSTRAINT delivery_users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Remove constraint NOT NULL da coluna phone (se existir)
-- Isso permite cadastrar entregador sem telefone
ALTER TABLE public.delivery_users ALTER COLUMN phone DROP NOT NULL;

-- Promove o usuário como entregador/vendedor
-- ID: 895f7985-ab8b-4ee7-846b-5e2cfbffdacb

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
