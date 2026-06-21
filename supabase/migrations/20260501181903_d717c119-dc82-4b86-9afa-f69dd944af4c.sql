-- ============ CATEGORIAS ============
INSERT INTO public.categories (id, name, icon) VALUES
  ('cat-hortifruti', 'Hortifrúti', '🥬'),
  ('cat-acougue', 'Açougue', '🥩'),
  ('cat-padaria', 'Padaria', '🥖'),
  ('cat-bebidas', 'Bebidas', '🥤'),
  ('cat-limpeza', 'Limpeza', '🧴'),
  ('cat-mercearia', 'Mercearia', '🛒')
ON CONFLICT (id) DO NOTHING;

-- ============ PRODUTOS ============
INSERT INTO public.products (id, name, description, price, promo_price, stock, unit, image, category_id, show_in_offers) VALUES
  -- Hortifrúti
  ('prd-banana',   'Banana Prata',         'Cacho fresco aprox. 1kg',     6.99, NULL,  120, 'kg', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', 'cat-hortifruti', false),
  ('prd-maca',     'Maçã Gala',            'Maçã nacional unidade',       1.49, NULL,   80, 'un', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400', 'cat-hortifruti', false),
  ('prd-tomate',   'Tomate Italiano',      'Tomate fresco kg',            8.90, 6.90,   50, 'kg', 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400', 'cat-hortifruti', true),
  ('prd-alface',   'Alface Crespa',        'Pé selecionado',              3.49, NULL,   40, 'un', 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?w=400', 'cat-hortifruti', false),
  -- Açougue
  ('prd-picanha',  'Picanha Bovina',       'Peça resfriada kg',          69.90, 59.90,  15, 'kg', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400', 'cat-acougue', true),
  ('prd-frango',   'Filé de Frango',       'Peito sem osso kg',          18.90, NULL,   30, 'kg', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400', 'cat-acougue', false),
  ('prd-linguica', 'Linguiça Toscana',     'Pacote 1kg',                 22.90, NULL,   25, 'kg', 'https://images.unsplash.com/photo-1601925268875-c5a2716d6f12?w=400', 'cat-acougue', false),
  ('prd-costela',  'Costela Bovina',       'Resfriada kg',               34.90, 29.90,  20, 'kg', 'https://images.unsplash.com/photo-1558030006-450675393462?w=400', 'cat-acougue', true),
  -- Padaria
  ('prd-pao-fr',   'Pão Francês',          'Quentinho kg',               14.90, NULL,  100, 'kg', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 'cat-padaria', false),
  ('prd-pao-int',  'Pão Integral',         'Forma 500g',                  9.90, 7.90,   35, 'un', 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', 'cat-padaria', true),
  ('prd-bolo',     'Bolo de Chocolate',    'Caseiro 600g',               24.90, NULL,   12, 'un', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', 'cat-padaria', false),
  ('prd-croissant','Croissant Manteiga',   'Unidade fresca',              5.50, NULL,   45, 'un', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', 'cat-padaria', false),
  -- Bebidas
  ('prd-coca',     'Coca-Cola 2L',         'Garrafa PET',                10.99, 8.99,  200, 'un', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', 'cat-bebidas', true),
  ('prd-suco',     'Suco de Laranja 1L',   'Natural integral',           12.90, NULL,   60, 'un', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', 'cat-bebidas', false),
  ('prd-cerveja',  'Cerveja Heineken',     'Long neck 330ml',             6.99, 5.49,  300, 'un', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', 'cat-bebidas', true),
  ('prd-agua',     'Água Mineral 1,5L',    'Sem gás',                     3.49, NULL,  500, 'un', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', 'cat-bebidas', false),
  -- Limpeza
  ('prd-detergent','Detergente Ypê',       'Líquido 500ml',               2.99, NULL,  150, 'un', 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400', 'cat-limpeza', false),
  ('prd-sabao-po', 'Sabão em Pó Omo 1kg',  'Multiação',                  18.90, 14.90,  60, 'un', 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400', 'cat-limpeza', true),
  ('prd-amaciante','Amaciante Comfort 2L', 'Concentrado',                22.90, NULL,   40, 'un', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400', 'cat-limpeza', false),
  ('prd-alcool',   'Álcool em Gel 500g',   '70% antisséptico',            8.90, NULL,   90, 'un', 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400', 'cat-limpeza', false),
  -- Mercearia
  ('prd-arroz',    'Arroz Tio João 5kg',   'Tipo 1',                     28.90, 24.90,  80, 'un', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 'cat-mercearia', true),
  ('prd-feijao',   'Feijão Carioca 1kg',   'Tipo 1',                      9.90, NULL,  120, 'un', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400', 'cat-mercearia', false),
  ('prd-oleo',     'Óleo de Soja Liza 1L', 'Garrafa',                     7.49, NULL,  100, 'un', 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400', 'cat-mercearia', false),
  ('prd-cafe',     'Café Pilão 500g',      'Tradicional a vácuo',        18.90, 15.90,  70, 'un', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', 'cat-mercearia', true)
ON CONFLICT (id) DO NOTHING;

-- ============ COMBOS ============
INSERT INTO public.combos (id, name, description, image, discount_percent, product_ids) VALUES
  ('combo-churrasco',
    'Combo Churrasco Completo',
    'Picanha + Linguiça + Cerveja gelada — perfeito para o final de semana',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    15,
    ARRAY['prd-picanha','prd-linguica','prd-cerveja']),
  ('combo-cafe',
    'Combo Café da Manhã',
    'Pão integral + Café Pilão + Suco de laranja',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600',
    10,
    ARRAY['prd-pao-int','prd-cafe','prd-suco']),
  ('combo-limpeza',
    'Combo Limpeza Total',
    'Detergente + Sabão em pó + Amaciante com desconto especial',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
    20,
    ARRAY['prd-detergent','prd-sabao-po','prd-amaciante'])
ON CONFLICT (id) DO NOTHING;

-- ============ ENCARTE ============
INSERT INTO public.flyers (title, subtitle, valid_date, active, min_delivery_value, product_ids)
SELECT
  'Ofertas da Semana',
  'Aproveite os preços baixos do Favorito Supermercado',
  (now() + interval '7 days')::date,
  true,
  80,
  ARRAY['prd-tomate','prd-picanha','prd-costela','prd-pao-int','prd-coca','prd-cerveja','prd-sabao-po','prd-arroz','prd-cafe']
WHERE NOT EXISTS (SELECT 1 FROM public.flyers WHERE title = 'Ofertas da Semana');

-- ============ PEDIDOS ============
INSERT INTO public.orders (id, customer_name, customer_phone, items, delivery, total, payment_method, status, created_at)
SELECT * FROM (VALUES
  (gen_random_uuid(), 'Ana Souza',     '(67) 99988-1122',
    '[{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":2,"price":24.90},{"productId":"prd-feijao","productName":"Feijão Carioca 1kg","quantity":3,"price":9.90}]'::jsonb,
    '{"address":"Rua das Flores, 120","neighborhood":"Centro","city":"Coxim","fee":8.50}'::jsonb,
    87.30, 'pix', 'pendente', now() - interval '15 minutes'),

  (gen_random_uuid(), 'Carlos Mendes', '(67) 99877-2233',
    '[{"productId":"prd-picanha","productName":"Picanha Bovina","quantity":1,"price":59.90},{"productId":"prd-cerveja","productName":"Cerveja Heineken","quantity":6,"price":5.49}]'::jsonb,
    '{"address":"Av. Brasil, 980","neighborhood":"Jardim Aeroporto","city":"Coxim","fee":12.00}'::jsonb,
    104.84, 'cartao_credito', 'preparando', now() - interval '45 minutes'),

  (gen_random_uuid(), 'Mariana Lima',  '(67) 99765-3344',
    '[{"productId":"prd-pao-fr","productName":"Pão Francês","quantity":1,"price":14.90},{"productId":"prd-cafe","productName":"Café Pilão 500g","quantity":1,"price":15.90},{"productId":"prd-suco","productName":"Suco de Laranja 1L","quantity":1,"price":12.90}]'::jsonb,
    '{"address":"Rua das Acácias, 45","neighborhood":"Vila Nova","city":"Coxim","fee":7.00}'::jsonb,
    50.70, 'dinheiro', 'entregue', now() - interval '2 hours'),

  (gen_random_uuid(), 'João Pereira',  '(67) 99654-4455',
    '[{"productId":"prd-coca","productName":"Coca-Cola 2L","quantity":2,"price":8.99},{"productId":"prd-detergent","productName":"Detergente Ypê","quantity":4,"price":2.99}]'::jsonb,
    '{"address":"Rua XV de Novembro, 300","neighborhood":"Centro","city":"Coxim","fee":6.00}'::jsonb,
    35.94, 'pix', 'entregue', now() - interval '5 hours'),

  (gen_random_uuid(), 'Beatriz Costa', '(67) 99543-5566',
    '[{"productId":"prd-frango","productName":"Filé de Frango","quantity":2,"price":18.90},{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":1,"price":24.90},{"productId":"prd-oleo","productName":"Óleo de Soja Liza 1L","quantity":2,"price":7.49}]'::jsonb,
    '{"address":"Rua Pantanal, 88","neighborhood":"São Francisco","city":"Coxim","fee":10.00}'::jsonb,
    87.68, 'cartao_debito', 'preparando', now() - interval '1 hour'),

  (gen_random_uuid(), 'Rafael Alves',  '(67) 99432-6677',
    '[{"productId":"prd-costela","productName":"Costela Bovina","quantity":2,"price":29.90},{"productId":"prd-cerveja","productName":"Cerveja Heineken","quantity":12,"price":5.49}]'::jsonb,
    '{"address":"Av. Goiás, 1500","neighborhood":"Piracema","city":"Coxim","fee":14.00}'::jsonb,
    139.68, 'cartao_credito', 'entregue', now() - interval '1 day'),

  (gen_random_uuid(), 'Patrícia Rocha','(67) 99321-7788',
    '[{"productId":"prd-banana","productName":"Banana Prata","quantity":2,"price":6.99},{"productId":"prd-tomate","productName":"Tomate Italiano","quantity":1,"price":6.90},{"productId":"prd-alface","productName":"Alface Crespa","quantity":2,"price":3.49}]'::jsonb,
    '{"address":"Rua Goiânia, 22","neighborhood":"Flamboyant","city":"Coxim","fee":7.50}'::jsonb,
    35.36, 'pix', 'pendente', now() - interval '8 minutes'),

  (gen_random_uuid(), 'Eduardo Silva', '(67) 99210-8899',
    '[{"productId":"prd-sabao-po","productName":"Sabão em Pó Omo 1kg","quantity":2,"price":14.90},{"productId":"prd-amaciante","productName":"Amaciante Comfort 2L","quantity":1,"price":22.90},{"productId":"prd-alcool","productName":"Álcool em Gel 500g","quantity":1,"price":8.90}]'::jsonb,
    '{"address":"Rua Mato Grosso, 410","neighborhood":"Centro","city":"Coxim","fee":6.00}'::jsonb,
    67.60, 'dinheiro', 'entregue', now() - interval '2 days')
) AS v(id, customer_name, customer_phone, items, delivery, total, payment_method, status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.orders WHERE customer_phone = v.customer_phone);