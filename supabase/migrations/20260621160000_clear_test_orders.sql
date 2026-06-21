-- Limpa todos os pedidos de teste
-- ATENÇÃO: Esta migration apaga TODOS os pedidos do banco
-- Usar apenas em ambiente de teste/dev

DELETE FROM public.orders;

-- Reset das sequences se houver (para IDs que não são UUID)
-- (Não se aplica aqui porque orders.id é UUID)
