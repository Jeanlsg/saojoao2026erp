-- Restrição: pedido só pode ir para status 'entregue' se já estiver pago.
-- Esta regra vale tanto para o admin quanto para o cliente.

CREATE OR REPLACE FUNCTION public.check_can_deliver()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se está indo para 'entregue' mas ainda não foi pago, bloqueia
  IF (TG_OP = 'UPDATE' AND NEW.status = 'entregue' AND NEW.paid = false) THEN
    RAISE EXCEPTION 'Pedido precisa estar pago antes de ser marcado como entregue. Marque "Pago" primeiro.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Se está indo para 'preparando' mas não pago, também bloqueia
  IF (TG_OP = 'UPDATE' AND NEW.status = 'preparando' AND NEW.paid = false) THEN
    RAISE EXCEPTION 'Pedido precisa estar pago antes de começar a preparação.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_can_deliver ON public.orders;
CREATE TRIGGER trg_check_can_deliver
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status IN ('preparando', 'entregue'))
  EXECUTE FUNCTION public.check_can_deliver();
