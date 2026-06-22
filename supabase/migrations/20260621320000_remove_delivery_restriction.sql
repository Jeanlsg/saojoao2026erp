-- Remove a restrição de bloquear mudança para 'entregue' se não estiver pago
-- Agora o admin pode mudar status livremente (PDV controla o pagamento)

DROP TRIGGER IF EXISTS trg_check_can_deliver ON public.orders;
DROP FUNCTION IF EXISTS public.check_can_deliver();
