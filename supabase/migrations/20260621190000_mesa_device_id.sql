-- Adiciona coluna mesa_device_id na tabela orders
-- Vincula o pedido ao device_id da mesa (impede que outra mesa use o mesmo login)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mesa_device_id TEXT;

COMMENT ON COLUMN public.orders.mesa_device_id IS 'Device ID da mesa que fez o pedido (sessão local)';
