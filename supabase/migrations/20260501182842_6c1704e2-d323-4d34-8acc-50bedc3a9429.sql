-- =========================================================
-- 1) FUNÇÕES de baixa/devolução de estoque
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_stock_delta(_items jsonb, _direction int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item record;
BEGIN
  -- _direction = -1 => debita estoque ; +1 => devolve estoque
  FOR item IN
    SELECT
      (value->>'productId')::text AS pid,
      COALESCE((value->>'quantity')::int, 0) AS qty
    FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    IF item.pid IS NOT NULL AND item.qty > 0 THEN
      UPDATE public.products
         SET stock = GREATEST(0, stock + (_direction * item.qty))
       WHERE id = item.pid;
    END IF;
  END LOOP;
END;
$$;

-- =========================================================
-- 2) TRIGGER: baixa no INSERT, devolve/rebaixa no UPDATE de status
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Pedido novo: baixa estoque, exceto se já vier cancelado
    IF NEW.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(NEW.items, -1);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status mudou para cancelado => devolve
    IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(OLD.items, +1);
    -- Saiu de cancelado para outro status => rebaixa
    ELSIF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(NEW.items, -1);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock ON public.orders;
CREATE TRIGGER trg_orders_stock
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_stock();

-- =========================================================
-- 3) Bloquear EXECUTE público das funções utilitárias
-- =========================================================
REVOKE ALL ON FUNCTION public.apply_stock_delta(jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_order_stock() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 4) Habilitar Realtime para products e orders
-- =========================================================
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.orders   REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.products';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings';
  END IF;
END $$;