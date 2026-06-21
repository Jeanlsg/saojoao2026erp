-- Garante que todas as colunas necessárias para o PDV (Frente de Caixa) existam
-- na tabela orders. Esta migration é idempotente — só adiciona se faltar.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery jsonb,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'dinheiro',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Garante índices para queries comuns do PDV
CREATE INDEX IF NOT EXISTS idx_orders_paid ON public.orders(paid);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid ON public.orders(status, paid);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Garante que orders está na publicação de realtime (para o AdminContext)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- Permite INSERT para admins (RLS — necessário para o PDV criar pedidos)
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
CREATE POLICY "Admins can insert orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Permite UPDATE para admins
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Garante que authenticated (incluindo admins) pode SELECT
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
CREATE POLICY "Authenticated can read orders" ON public.orders
  FOR SELECT TO authenticated USING (true);
