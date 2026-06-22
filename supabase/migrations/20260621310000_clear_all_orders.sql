-- ATENÇÃO: Esta migration apaga TODOS os pedidos do banco
-- Use apenas se for ambiente de teste

DELETE FROM public.orders;

-- Reset da contagem de auto-increment (caso tenha)
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
