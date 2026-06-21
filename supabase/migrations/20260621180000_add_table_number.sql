-- Adiciona coluna table_number na tabela orders
-- Usado para identificar a mesa do cliente no evento (sem precisar de cadastro)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number TEXT;

COMMENT ON COLUMN public.orders.table_number IS 'Número da mesa do cliente no evento (opcional)';
