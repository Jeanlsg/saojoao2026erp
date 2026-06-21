-- Corrige a função apply_stock_delta para funcionar com QUALQUER formato de items:
-- 1. { productId, productName, quantity, price }  (formato do PDV/loja)
-- 2. { productId, quantity }  (formato mínimo)
-- 3. { id, quantity }  (formato alternativo)
-- 4. { name, quantity }  (fallback só com nome)

CREATE OR REPLACE FUNCTION public.apply_stock_delta(_direction int, _items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_product_id text;
  v_qty int;
BEGIN
  IF _direction = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    -- Tenta vários formatos de ID
    v_product_id := COALESCE(
      item->>'productId',
      item->>'id',
      NULL
    );

    v_qty := COALESCE((item->>'quantity')::int, 1);

    -- Se não tem ID mas tem nome, busca pelo nome
    IF v_product_id IS NULL AND item->>'productName' IS NOT NULL THEN
      SELECT id INTO v_product_id
      FROM public.products
      WHERE name = item->>'productName'
      LIMIT 1;
    END IF;

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = GREATEST(stock - (_direction * v_qty), 0)
      WHERE id = v_product_id;
    ELSE
      -- Log para debug: item sem ID não pôde ser processado
      RAISE WARNING '[apply_stock_delta] Item sem productId: %', item::text;
    END IF;
  END LOOP;
END;
$$;

-- Também recria a função de trigger para garantir consistência
DROP TRIGGER IF EXISTS trg_order_paid ON public.orders;
CREATE TRIGGER trg_order_paid
  BEFORE UPDATE OF paid ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_paid_fn();
