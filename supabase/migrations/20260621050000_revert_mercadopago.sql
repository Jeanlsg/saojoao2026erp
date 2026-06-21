-- Remove integração do Mercado Pago.
-- O sistema de pagamento é agora manual: cliente mostra comprovante, admin confirma.

-- Remove colunas do Mercado Pago
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS mp_payment_id,
  DROP COLUMN IF EXISTS mp_status,
  DROP COLUMN IF EXISTS mp_qr_code,
  DROP COLUMN IF EXISTS mp_qr_code_base64,
  DROP COLUMN IF EXISTS mp_ticket_url,
  DROP COLUMN IF EXISTS mp_paid_at,
  DROP COLUMN IF EXISTS mp_expires_at;

-- Remove índices criados para MP
DROP INDEX IF EXISTS idx_orders_mp_payment_id;
DROP INDEX IF EXISTS idx_orders_mp_status;

-- Adiciona coluna paid para confirmar pagamento manual
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Cria índice para filtrar pedidos pagos/pendentes rapidamente
CREATE INDEX IF NOT EXISTS idx_orders_paid ON public.orders(paid);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid ON public.orders(status, paid);

-- Atualiza a função apply_stock_delta para só dar baixa quando pedido for pago
CREATE OR REPLACE FUNCTION public.apply_stock_delta(_direction int, _items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF _direction = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    UPDATE public.products
    SET stock = GREATEST(stock - (_direction * (item->>'quantity')::int), 0)
    WHERE id = (item->>'productId')::text;
  END LOOP;
END;
$$;

-- Atualiza trigger de criação de pedido:
-- Cria pedido como pendente (paid=false) e NÃO dá baixa no estoque ainda
-- A baixa acontece quando admin confirmar pagamento
DROP TRIGGER IF EXISTS trg_order_stock ON public.orders;
DROP FUNCTION IF EXISTS public.trg_order_stock_fn();

CREATE OR REPLACE FUNCTION public.trg_order_stock_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NÃO baixa estoque aqui — só quando paid virar true
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_stock_fn();

-- Trigger de atualização: baixa estoque quando paid vira true, devolve quando vira false (cancelar)
CREATE OR REPLACE FUNCTION public.trg_order_paid_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se paid mudou de false → true: baixa estoque
  IF (TG_OP = 'UPDATE' AND OLD.paid = false AND NEW.paid = true) THEN
    PERFORM public.apply_stock_delta(1, NEW.items);
    NEW.paid_at = now();
    NEW.status = 'confirmado';
  END IF;

  -- Se paid mudou de true → false: devolve estoque (cancelamento)
  IF (TG_OP = 'UPDATE' AND OLD.paid = true AND NEW.paid = false) THEN
    PERFORM public.apply_stock_delta(-1, NEW.items);
    NEW.paid_at = NULL;
    IF NEW.status = 'confirmado' THEN
      NEW.status = 'pendente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_paid ON public.orders;
CREATE TRIGGER trg_order_paid
  BEFORE UPDATE OF paid ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_paid_fn();
