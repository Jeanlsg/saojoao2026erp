-- Função para gerar email genérico para entregadores
-- Formato: entregador-001@arraia.raulpompeia.app

CREATE OR REPLACE FUNCTION public.generate_delivery_email()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  new_email TEXT;
BEGIN
  -- Encontra o próximo número disponível
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(email FROM 'entregador-(\d+)@') AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM auth.users
  WHERE email LIKE 'entregador-%@arraia.raulpompeia.app';

  new_email := 'entregador-' || LPAD(next_number::TEXT, 3, '0') || '@arraia.raulpompeia.app';

  RETURN new_email;
END;
$$;

COMMENT ON FUNCTION public.generate_delivery_email() IS 'Gera um email genérico sequencial para entregadores (entregador-001@arraia.raulpompeia.app)';
