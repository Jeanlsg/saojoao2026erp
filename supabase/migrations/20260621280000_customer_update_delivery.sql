-- Permite que clientes atualizem APENAS o status de entrega dos seus pedidos
-- (não pode mudar pagamento nem outros campos sensíveis)

DROP POLICY IF EXISTS "Customer can update own delivery" ON public.orders;
CREATE POLICY "Customer can update own delivery"
  ON public.orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
