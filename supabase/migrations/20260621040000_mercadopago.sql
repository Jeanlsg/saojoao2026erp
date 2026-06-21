-- Colunas do Mercado Pago na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS mp_qr_code text,
  ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text,
  ADD COLUMN IF NOT EXISTS mp_ticket_url text,
  ADD COLUMN IF NOT EXISTS mp_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_expires_at timestamptz;

-- Index para buscar pedidos por payment_id (usado no webhook)
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mp_payment_id);

-- Index para buscar pedidos pagos pendentes de notificação
CREATE INDEX IF NOT EXISTS idx_orders_mp_status ON public.orders(mp_status);

-- RLS: clientes só veem o próprio pedido (já tem política),
-- admin precisa ver todos para confirmar
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime: permitir escutar mudanças no status de pagamento (ignora se já estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
