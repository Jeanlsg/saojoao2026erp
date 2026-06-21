-- Promove o email do admin principal a 'admin' automaticamente
-- Roda toda vez que esse usuário faz login, garantindo que sempre tenha o role

-- Função que sincroniza o role de admin baseado no email
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o email for o admin principal, garante que tem role 'admin'
  IF NEW.email = 'escolaraulpompeia175@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger que dispara quando um novo usuário é criado
DROP TRIGGER IF EXISTS trg_sync_admin_role ON auth.users;
CREATE TRIGGER trg_sync_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_role();

-- Backfill: se o usuário já existe, promove agora
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'escolaraulpompeia175@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;