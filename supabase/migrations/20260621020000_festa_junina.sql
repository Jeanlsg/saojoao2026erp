-- Limpa dados do supermercado antigo e popula com cardápio da Festa Junina
-- Escola Raul Pompéia

-- ============ LIMPEZA DE DADOS ANTIGOS ============
TRUNCATE public.products, public.categories, public.combos, public.flyers, public.orders,
        public.discount_rules, public.freight_ranges, public.store_settings,
        public.device_tokens CASCADE;

-- ============ STORE SETTINGS (sem nome fantasia, aguardando logo) ============
INSERT INTO public.store_settings (key, value) VALUES
  ('store_name', ''),
  ('store_phone', ''),
  ('store_address', 'R. do Cobalto, 175 - Dom Avelar, Petrolina - PE, 56322-450'),
  ('store_cep', '56322-450'),
  ('store_maps_url', 'https://maps.app.goo.gl/NhCFynTyE175id1GA'),
  ('route_factor', '1.0'),
  ('event_mode', 'true'),
  ('event_name', 'Arraiá da Escola Raul Pompéia')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============ CATEGORIAS ============
INSERT INTO public.categories (id, name, icon) VALUES
  ('cat-comidas', 'Comidas Típicas', '🍲'),
  ('cat-lanches', 'Lanches', '🌭'),
  ('cat-bebidas', 'Bebidas', '🥤'),
  ('cat-brinquedos', 'Brinquedos', '🎠')
ON CONFLICT (id) DO NOTHING;

-- ============ PRODUTOS - COMIDAS TÍPICAS ============
INSERT INTO public.products (id, name, description, price, stock, unit, image, category_id, show_in_offers) VALUES
  ('prd-milho',     'Milho Cozido',     'Milho verde cozido na hora',                7.00, 100, 'un', '/produtos/milho.jpg',          'cat-comidas', false),
  ('prd-pamonha',   'Pamonha',          'Pamonha tradicional',                       7.00, 100, 'un', '/produtos/pamonha.jpg',        'cat-comidas', false),
  ('prd-canjica',   'Canjica',          'Canjica com leite condensado',              7.00, 100, 'un', '/produtos/canjica.jpg',        'cat-comidas', false),
  ('prd-mugunza',   'Mungunzá',         'Mungunzá cremoso',                          7.00, 100, 'un', '/produtos/mugunza.jpg',        'cat-comidas', false),
  ('prd-bolo-milho','Bolo de Milho',    'Bolo caseiro de milho',                    5.00,  50, 'un', '/produtos/bolo-milho.jpg',     'cat-comidas', false),
  ('prd-bolo-maca', 'Bolo de Macaxeira','Bolo caseiro de macaxeira',                5.00,  50, 'un', '/produtos/bolo-macaxeira.jpg', 'cat-comidas', false),
  ('prd-arroz-doce','Arroz Doce',       'Arroz doce com canela',                    5.00,  80, 'un', '/produtos/arroz-doce.jpg',     'cat-comidas', false)
ON CONFLICT (id) DO NOTHING;

-- ============ PRODUTOS - LANCHES ============
INSERT INTO public.products (id, name, description, price, stock, unit, image, category_id, show_in_offers) VALUES
  ('prd-cachorro',  'Cachorro-Quente',  'Cachorro-quente com molho especial',        9.00, 150, 'un', '/produtos/cachorro-quente.jpg', 'cat-lanches', false),
  ('prd-algodao',   'Algodão-Doce',     'Algodão doce colorido',                     5.00, 200, 'un', '/produtos/algodao-doce.jpg',   'cat-lanches', false),
  ('prd-pipoca',    'Pipoca',           'Pipoca salgada na hora',                    4.00, 300, 'un', '/produtos/pipoca.jpg',         'cat-lanches', false),
  ('prd-caldo',     'Caldo de Costela', 'Caldo de costela bem quentinho',          12.00, 100, 'un', '/produtos/caldo.jpg',          'cat-lanches', false),
  ('prd-crepe',     'Crepe',            'Crepe doce ou salgado',                     9.00, 100, 'un', '/produtos/crepe.jpg',          'cat-lanches', false),
  ('prd-batata',    'Batata Frita',     'Porção de batata frita crocante',           7.00, 150, 'un', '/produtos/batata.jpg',         'cat-lanches', false),
  ('prd-espetinho', 'Espetinho',        'Espetinho de carne ou frango',             15.00, 100, 'un', '/produtos/espetinho.jpg',      'cat-lanches', false)
ON CONFLICT (id) DO NOTHING;

-- ============ PRODUTOS - BEBIDAS ============
INSERT INTO public.products (id, name, description, price, stock, unit, image, category_id, show_in_offers) VALUES
  ('prd-budweiser', 'Cerveja Budweiser',      'Cerveja Budweiser long neck 330ml',            8.00, 200, 'un', '/produtos/budweiser.jpg',   'cat-bebidas', false),
  ('prd-brahma-skol','Cerveja (Brahma ou Skol)', 'Cerveja Brahma ou Skol long neck 330ml',       7.00, 300, 'un', '/produtos/brahma-skol.jpg', 'cat-bebidas', false),
  ('prd-refri-200', 'Refrigerante 200ml',     'Lata 200ml - diversos sabores',                 4.00, 300, 'un', '/produtos/refri-200.jpg',   'cat-bebidas', false),
  ('prd-coca-350',  'Coca-Cola 350ml',        'Coca-Cola lata 350ml',                          6.00, 200, 'un', '/produtos/coca-350.jpg',    'cat-bebidas', false),
  ('prd-agua',      'Água',                   'Água mineral 500ml',                            2.50, 500, 'un', '/produtos/agua.jpg',        'cat-bebidas', false)
ON CONFLICT (id) DO NOTHING;

-- ============ PRODUTOS - BRINQUEDOS ============
INSERT INTO public.products (id, name, description, price, stock, unit, image, category_id, show_in_offers) VALUES
  ('prd-pulseira',  'Pulseira Infantil',  'Acesso ilimitado: pula-pula, parquinho e tobogã. A criança poderá brincar à vontade!', 30.00, 200, 'un', '/produtos/pulseira.svg', 'cat-brinquedos', true)
ON CONFLICT (id) DO NOTHING;
