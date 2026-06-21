-- Desativa a confirmação de email ao criar conta
-- ATENÇÃO: Isso permite login imediato após cadastro
-- (Em produção, mantenha confirmação ativa para segurança)

-- Atualiza a config do Supabase Auth para não exigir confirmação
-- (Esta é uma config server-side, não pode ser feita via SQL direto)
-- Para aplicar: Supabase Dashboard → Authentication → Sign In/Up →
-- Desmarcar "Enable email confirmations"

-- Adiciona trigger para auto-confirmar emails se a config server não foi alterada
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-confirma o email do usuário
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger que auto-confirma ao criar profile
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON public.profiles;
CREATE TRIGGER auto_confirm_user_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- Para profiles existentes que estão sem confirmação
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;
