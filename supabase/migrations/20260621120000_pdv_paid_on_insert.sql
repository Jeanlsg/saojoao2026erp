-- Ajusta triggers para funcionar com o PDV (Frente de Caixa)
-- Cenário 1 — PIX: INSERT com paid=true → deve dar baixa no estoque IMEDIATAMENTE
-- Cenário 2 — Dinheiro: INSERT com paid=true → mesma coisa
-- Cenário 3 — Loja: INSERT com paid=false → NÃO dá baixa, baixa só quando UPDATE paid=true

CREATE OR REPLACE FUNCTION public.trg_order_stock_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o pedido JÁ nasce como pago (PIX/Dinheiro via PDV),
  -- dá baixa no estoque IMEDIATAMENTE no INSERT
  IF NEW.paid = true THEN
    PERFORM public.apply_stock_delta(1, NEW.items);
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := now();
    END IF;
    IF NEW.status = 'pendente' OR NEW.status IS NULL THEN
      NEW.status := 'confirmado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_stock ON public.orders;
CREATE TRIGGER trg_order_stock
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_stock_fn();
