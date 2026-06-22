-- Atualiza pedidos antigos para terem os campos necessários
-- Garante que delivery_status tenha valor padrão 'pending'
UPDATE public.orders
SET delivery_status = 'pending'
WHERE delivery_status IS NULL;

-- Garante que pedidos antigos tenham delivery_code
-- (só atualiza os que não têm)
UPDATE public.orders
SET delivery_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE delivery_code IS NULL;

-- Verifica quantos pedidos precisam de atenção
DO $$
DECLARE
  sem_mesa INTEGER;
  sem_pagamento INTEGER;
  sem_entrega INTEGER;
BEGIN
  SELECT COUNT(*) INTO sem_mesa FROM public.orders WHERE table_number IS NULL;
  SELECT COUNT(*) INTO sem_pagamento FROM public.orders WHERE paid = false;
  SELECT COUNT(*) INTO sem_entrega FROM public.orders WHERE status NOT IN ('entregue', 'cancelado');

  RAISE NOTICE 'Pedidos sem mesa: %', sem_mesa;
  RAISE NOTICE 'Pedidos não pagos: %', sem_pagamento;
  RAISE NOTICE 'Pedidos pendentes: %', sem_entrega;
END $$;
