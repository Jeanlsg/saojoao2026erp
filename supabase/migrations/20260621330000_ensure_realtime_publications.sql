-- Garante que a tabela orders está na publicação do Realtime
-- Necessário para receber updates em tempo real

DO $$
BEGIN
  -- Verifica se a tabela orders está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- Verifica se a tabela delivery_users está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_users;
  END IF;

  -- Verifica se a tabela mesas_ativas está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mesas_ativas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas_ativas;
  END IF;
END $$;

-- Comentário
COMMENT ON TABLE public.orders IS 'Pedidos da loja - Realtime habilitado';
