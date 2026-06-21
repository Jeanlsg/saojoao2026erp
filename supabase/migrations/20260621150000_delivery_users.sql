-- Tabela de usuários de entrega
CREATE TABLE IF NOT EXISTS public.delivery_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Vincula ao usuário do Supabase Auth
  name TEXT NOT NULL,
  phone TEXT,
  pin TEXT, -- 4 dígitos (opcional, para login rápido)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adiciona coluna user_id se a tabela já existir (para migration incremental)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.delivery_users ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Garante que phone seja único apenas quando não nulo
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_users_phone_nonnull
  ON public.delivery_users(phone)
  WHERE phone IS NOT NULL;

-- Colunas para rastreamento de entrega na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES public.delivery_users(id),
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- RLS para delivery_users
ALTER TABLE public.delivery_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admin pode fazer tudo (usa a função has_role existente)
CREATE POLICY "Admin full access to delivery_users"
  ON public.delivery_users
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Policy: Usuários delivery podem ver seu próprio registro
DROP POLICY IF EXISTS "Delivery user can view own record" ON public.delivery_users;
CREATE POLICY "Delivery user can view own record"
  ON public.delivery_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- Policy para Orders: Entregadores podem ver pedidos confirmados
DROP POLICY IF EXISTS "Entregador pode ver pedidos confirmados" ON public.orders;
CREATE POLICY "Entregador pode ver pedidos confirmados"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    status IN ('confirmado', 'entregue')
  );

-- Policy para Orders: Entregadores podem atualizar status para entregue
DROP POLICY IF EXISTS "Entregador pode marcar como entregue" ON public.orders;
CREATE POLICY "Entregador pode marcar como entregue"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    status IN ('confirmado', 'pendente')
  )
  WITH CHECK (
    status IN ('confirmado', 'pendente', 'entregue')
  );

-- Função para verificar se usuário é entregador
CREATE OR REPLACE FUNCTION public.is_delivery_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_users
    WHERE user_id = auth.uid() AND active = true
  )
$$;

-- Comentários
COMMENT ON TABLE public.delivery_users IS 'Usuários de entrega (entregadores) - vinculados ao auth.users';
COMMENT ON COLUMN public.orders.delivered_by IS 'Entregador que confirmou a entrega';
COMMENT ON COLUMN public.orders.delivered_at IS 'Data/hora da confirmação de entrega';
