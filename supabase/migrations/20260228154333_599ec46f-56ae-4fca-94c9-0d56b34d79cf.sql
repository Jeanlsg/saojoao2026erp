
-- Store settings (CEP, route factor, etc.)
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read store settings" ON public.store_settings
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage store settings" ON public.store_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🛒',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.categories
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  image text NOT NULL DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  unit text DEFAULT 'un',
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON public.products
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Freight ranges
CREATE TABLE public.freight_ranges (
  id text PRIMARY KEY,
  min_km numeric NOT NULL DEFAULT 0,
  max_km numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freight_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read freight ranges" ON public.freight_ranges
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage freight ranges" ON public.freight_ranges
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Combos
CREATE TABLE public.combos (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  original_price numeric NOT NULL DEFAULT 0,
  promo_price numeric NOT NULL DEFAULT 0,
  image text NOT NULL DEFAULT '',
  product_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read combos" ON public.combos
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage combos" ON public.combos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TABLE public.orders (
  id text PRIMARY KEY,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  customer_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read orders" ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default data
INSERT INTO public.store_settings (key, value) VALUES
  ('store_cep', '01001-000'),
  ('route_factor', '1.4');

INSERT INTO public.categories (id, name, icon) VALUES
  ('mercearia', 'Mercearia', '🛒'),
  ('bebidas', 'Bebidas', '🥤'),
  ('hortifruti', 'Hortifruti', '🍎'),
  ('padaria', 'Padaria', '🍞'),
  ('frios', 'Frios', '🧀'),
  ('limpeza', 'Limpeza', '🧹'),
  ('higiene', 'Higiene', '🧴');

INSERT INTO public.freight_ranges (id, min_km, max_km, price) VALUES
  ('fr1', 0, 5, 5.00),
  ('fr2', 5, 8, 8.00),
  ('fr3', 8, 15, 15.00);

INSERT INTO public.products (id, name, price, image, category_id, unit, stock) VALUES
  ('p1', 'Arroz Tipo 1 - 5kg', 22.90, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop', 'mercearia', 'pct', 50),
  ('p2', 'Feijão Carioca - 1kg', 8.49, 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=300&h=300&fit=crop', 'mercearia', 'pct', 40),
  ('p3', 'Açúcar Cristal - 1kg', 4.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=300&fit=crop', 'mercearia', 'pct', 60),
  ('p4', 'Óleo de Soja - 900ml', 7.29, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop', 'mercearia', 'un', 30),
  ('p5', 'Macarrão Espaguete - 500g', 3.99, 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=300&h=300&fit=crop', 'mercearia', 'pct', 45),
  ('p6', 'Café Torrado e Moído - 500g', 15.90, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop', 'mercearia', 'pct', 25),
  ('p7', 'Refrigerante Cola - 2L', 8.99, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop', 'bebidas', 'un', 80),
  ('p8', 'Suco de Laranja - 1L', 6.49, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop', 'bebidas', 'un', 35),
  ('p9', 'Água Mineral - 1.5L', 2.49, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop', 'bebidas', 'un', 100),
  ('p10', 'Cerveja Lata - 350ml', 3.99, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&h=300&fit=crop', 'bebidas', 'un', 120),
  ('p11', 'Banana Prata - kg', 5.99, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop', 'hortifruti', 'kg', 20),
  ('p12', 'Tomate Italiano - kg', 7.99, 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=300&h=300&fit=crop', 'hortifruti', 'kg', 15),
  ('p13', 'Cebola - kg', 4.49, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&h=300&fit=crop', 'hortifruti', 'kg', 25),
  ('p14', 'Alface Crespa', 2.99, 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop', 'hortifruti', 'un', 10),
  ('p15', 'Maçã Fuji - kg', 9.90, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop', 'hortifruti', 'kg', 18),
  ('p16', 'Pão Francês - kg', 12.90, 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=300&h=300&fit=crop', 'padaria', 'kg', 30),
  ('p17', 'Pão de Forma - 500g', 7.49, 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=300&h=300&fit=crop', 'padaria', 'un', 20),
  ('p18', 'Bolo de Chocolate', 18.90, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop', 'padaria', 'un', 5),
  ('p19', 'Presunto Fatiado - 200g', 8.99, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop', 'frios', 'pct', 15),
  ('p20', 'Queijo Mussarela - 200g', 10.90, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=300&h=300&fit=crop', 'frios', 'pct', 15),
  ('p21', 'Iogurte Natural - 170g', 3.49, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop', 'frios', 'un', 25),
  ('p22', 'Detergente Líquido - 500ml', 2.49, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=300&h=300&fit=crop', 'limpeza', 'un', 40),
  ('p23', 'Água Sanitária - 1L', 3.99, 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop', 'limpeza', 'un', 30),
  ('p24', 'Sabão em Pó - 1kg', 11.90, 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&h=300&fit=crop', 'limpeza', 'un', 20),
  ('p25', 'Papel Higiênico - 12 rolos', 15.90, 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=300&h=300&fit=crop', 'higiene', 'pct', 35),
  ('p26', 'Sabonete - 90g', 1.99, 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&h=300&fit=crop', 'higiene', 'un', 50),
  ('p27', 'Creme Dental - 90g', 4.49, 'https://images.unsplash.com/photo-1559304822-9eb2813c9844?w=300&h=300&fit=crop', 'higiene', 'un', 40);

INSERT INTO public.combos (id, name, description, original_price, promo_price, image, product_ids) VALUES
  ('c1', 'Kit Básico do Mês', 'Arroz 5kg + Feijão 1kg + Óleo 900ml + Açúcar 1kg', 43.67, 36.90, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=250&fit=crop', ARRAY['p1','p2','p4','p3']),
  ('c2', 'Combo Café da Manhã', 'Pão de Forma + Presunto + Queijo + Café 500g', 42.28, 34.90, 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=250&fit=crop', ARRAY['p17','p19','p20','p6']),
  ('c3', 'Combo Churrasco', 'Cerveja 6un + Refrigerante 2L + Cebola kg', 32.46, 27.90, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=250&fit=crop', ARRAY['p10','p7','p13']);

INSERT INTO public.orders (id, items, total, status, customer_name, created_at) VALUES
  ('o1', '[{"productName":"Arroz Tipo 1 - 5kg","quantity":2,"price":22.9},{"productName":"Feijão Carioca - 1kg","quantity":1,"price":8.49}]', 54.29, 'pendente', 'Maria Silva', now()),
  ('o2', '[{"productName":"Pão Francês - kg","quantity":1,"price":12.9},{"productName":"Café Torrado e Moído - 500g","quantity":1,"price":15.9}]', 28.80, 'preparando', 'João Santos', now() - interval '1 hour'),
  ('o3', '[{"productName":"Refrigerante Cola - 2L","quantity":3,"price":8.99}]', 26.97, 'entregue', 'Ana Oliveira', now() - interval '2 hours');
