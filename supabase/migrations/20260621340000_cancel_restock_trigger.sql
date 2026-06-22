-- Trigger: devolve estoque quando pedido é cancelado
-- Funciona mesmo se o pedido não estava pago (devolve baseado no status anterior)

CREATE OR REPLACE FUNCTION public.trg_order_cancelled_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só executa se o status mudou para 'cancelado'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'cancelado' AND NEW.status = 'cancelado') THEN
    -- Devolve o estoque (delta negativo = devolve)
    -- Só devolve se o pedido tinha baixado estoque antes (paid era true OU status era confirmado/preparando)
    IF (OLD.paid = true OR OLD.status IN ('confirmado', 'preparando')) THEN
      PERFORM public.apply_stock_delta(-1, NEW.items);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_cancelled ON public.orders;
CREATE TRIGGER trg_order_cancelled
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_cancelled_fn();
