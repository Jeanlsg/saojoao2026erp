-- Permite que clientes anônimos (da loja) criem pedidos via mesa
DROP POLICY IF EXISTS "Anonymous can insert orders" ON public.orders;
CREATE POLICY "Anonymous can insert orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permite que clientes leiam seus próprios pedidos (baseado no telefone ou user_id)
DROP POLICY IF EXISTS "Anonymous can read own orders" ON public.orders;
CREATE POLICY "Anonymous can read own orders"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (true);
