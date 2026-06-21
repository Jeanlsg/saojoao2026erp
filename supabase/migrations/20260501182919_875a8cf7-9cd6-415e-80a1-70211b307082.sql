-- TESTE 1: insere pedido e verifica baixa
DO $$
DECLARE
  v_order_id text := gen_random_uuid();
  v_arroz_before int;
  v_feijao_before int;
  v_arroz_after int;
  v_feijao_after int;
  v_arroz_canceled int;
  v_feijao_canceled int;
BEGIN
  SELECT stock INTO v_arroz_before FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_before FROM products WHERE id = 'prd-feijao';

  INSERT INTO public.orders (id, customer_name, customer_phone, items, total, payment_method, status)
  VALUES (
    v_order_id,
    'TESTE STOCK TRIGGER',
    '(00) 00000-0000',
    '[{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":3,"price":24.90},
      {"productId":"prd-feijao","productName":"Feijão Carioca 1kg","quantity":5,"price":9.90}]'::jsonb,
    121.20, 'pix', 'pendente'
  );

  SELECT stock INTO v_arroz_after FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_after FROM products WHERE id = 'prd-feijao';

  RAISE NOTICE 'BAIXA -> Arroz: % -> % (esperado %), Feijão: % -> % (esperado %)',
    v_arroz_before, v_arroz_after, v_arroz_before - 3,
    v_feijao_before, v_feijao_after, v_feijao_before - 5;

  IF v_arroz_after <> v_arroz_before - 3 OR v_feijao_after <> v_feijao_before - 5 THEN
    RAISE EXCEPTION 'FALHA na baixa de estoque!';
  END IF;

  -- Cancela e verifica devolução
  UPDATE public.orders SET status = 'cancelado' WHERE id = v_order_id;
  SELECT stock INTO v_arroz_canceled FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_canceled FROM products WHERE id = 'prd-feijao';

  RAISE NOTICE 'DEVOLUÇÃO -> Arroz: % (esperado %), Feijão: % (esperado %)',
    v_arroz_canceled, v_arroz_before, v_feijao_canceled, v_feijao_before;

  IF v_arroz_canceled <> v_arroz_before OR v_feijao_canceled <> v_feijao_before THEN
    RAISE EXCEPTION 'FALHA na devolução de estoque!';
  END IF;

  -- limpa pedido de teste
  DELETE FROM public.orders WHERE id = v_order_id;
  RAISE NOTICE 'TRIGGER OK';
END $$;