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
  '1234',  -- PIN padrão (mude depois no admin)
  true
)
ON CONFLICT (user_id) DO UPDATE
SET name = EXCLUDED.name,
    pin = EXCLUDED.pin,
    active = true;
