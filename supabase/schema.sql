
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. RLS for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 7. RLS for user_roles (only admins can manage, users can read own)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  );
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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

ALTER TABLE public.combos ADD COLUMN discount_percent numeric NOT NULL DEFAULT 0;

-- Migrate existing data: calculate discount percent from original/promo prices
UPDATE public.combos SET discount_percent = ROUND(((original_price - promo_price) / NULLIF(original_price, 0)) * 100, 1) WHERE original_price > 0;

-- Remove old price columns
ALTER TABLE public.combos DROP COLUMN original_price;
ALTER TABLE public.combos DROP COLUMN promo_price;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;-- Adiciona suporte a promoção por produto individual
-- promo_price: preço promocional (NULL = sem promoção)
-- show_in_offers: se deve aparecer na seção Ofertas Especiais

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promo_price numeric,
  ADD COLUMN IF NOT EXISTS show_in_offers boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'dinheiro';ALTER TABLE public.profiles ADD COLUMN cpf_cnpj text DEFAULT NULL;
-- Add user_id to orders for tracking customer purchases
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery jsonb;

-- Create discount_rules table for admin-managed promotions
CREATE TABLE public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  discount_percent numeric NOT NULL DEFAULT 0,
  rule_type text NOT NULL DEFAULT 'first_purchase',
  min_orders integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for discount_rules
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discount rules"
  ON public.discount_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active discount rules"
  ON public.discount_rules FOR SELECT TO anon, authenticated
  USING (active = true);
ALTER TABLE public.discount_rules 
  ADD COLUMN min_order_value numeric DEFAULT NULL,
  ADD COLUMN max_distance_km numeric DEFAULT NULL;CREATE TABLE public.flyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'Super Quinta',
  subtitle text DEFAULT '',
  valid_date date DEFAULT NULL,
  min_delivery_value numeric DEFAULT NULL,
  product_ids text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flyers" ON public.flyers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active flyers" ON public.flyers
  FOR SELECT TO anon, authenticated USING (active = true);-- ============ CATEGORIAS ============
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
INSERT INTO public.orders (customer_name, customer_phone, items, delivery, total, payment_method, status, created_at)
SELECT * FROM (VALUES
  ('Ana Souza',     '(67) 99988-1122',
    '[{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":2,"price":24.90},{"productId":"prd-feijao","productName":"Feijão Carioca 1kg","quantity":3,"price":9.90}]'::jsonb,
    '{"address":"Rua das Flores, 120","neighborhood":"Centro","city":"Coxim","fee":8.50}'::jsonb,
    87.30, 'pix', 'pendente', now() - interval '15 minutes'),

  ('Carlos Mendes', '(67) 99877-2233',
    '[{"productId":"prd-picanha","productName":"Picanha Bovina","quantity":1,"price":59.90},{"productId":"prd-cerveja","productName":"Cerveja Heineken","quantity":6,"price":5.49}]'::jsonb,
    '{"address":"Av. Brasil, 980","neighborhood":"Jardim Aeroporto","city":"Coxim","fee":12.00}'::jsonb,
    104.84, 'cartao_credito', 'preparando', now() - interval '45 minutes'),

  ('Mariana Lima',  '(67) 99765-3344',
    '[{"productId":"prd-pao-fr","productName":"Pão Francês","quantity":1,"price":14.90},{"productId":"prd-cafe","productName":"Café Pilão 500g","quantity":1,"price":15.90},{"productId":"prd-suco","productName":"Suco de Laranja 1L","quantity":1,"price":12.90}]'::jsonb,
    '{"address":"Rua das Acácias, 45","neighborhood":"Vila Nova","city":"Coxim","fee":7.00}'::jsonb,
    50.70, 'dinheiro', 'entregue', now() - interval '2 hours'),

  ('João Pereira',  '(67) 99654-4455',
    '[{"productId":"prd-coca","productName":"Coca-Cola 2L","quantity":2,"price":8.99},{"productId":"prd-detergent","productName":"Detergente Ypê","quantity":4,"price":2.99}]'::jsonb,
    '{"address":"Rua XV de Novembro, 300","neighborhood":"Centro","city":"Coxim","fee":6.00}'::jsonb,
    35.94, 'pix', 'entregue', now() - interval '5 hours'),

  ('Beatriz Costa', '(67) 99543-5566',
    '[{"productId":"prd-frango","productName":"Filé de Frango","quantity":2,"price":18.90},{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":1,"price":24.90},{"productId":"prd-oleo","productName":"Óleo de Soja Liza 1L","quantity":2,"price":7.49}]'::jsonb,
    '{"address":"Rua Pantanal, 88","neighborhood":"São Francisco","city":"Coxim","fee":10.00}'::jsonb,
    87.68, 'cartao_debito', 'preparando', now() - interval '1 hour'),

  ('Rafael Alves',  '(67) 99432-6677',
    '[{"productId":"prd-costela","productName":"Costela Bovina","quantity":2,"price":29.90},{"productId":"prd-cerveja","productName":"Cerveja Heineken","quantity":12,"price":5.49}]'::jsonb,
    '{"address":"Av. Goiás, 1500","neighborhood":"Piracema","city":"Coxim","fee":14.00}'::jsonb,
    139.68, 'cartao_credito', 'entregue', now() - interval '1 day'),

  ('Patrícia Rocha','(67) 99321-7788',
    '[{"productId":"prd-banana","productName":"Banana Prata","quantity":2,"price":6.99},{"productId":"prd-tomate","productName":"Tomate Italiano","quantity":1,"price":6.90},{"productId":"prd-alface","productName":"Alface Crespa","quantity":2,"price":3.49}]'::jsonb,
    '{"address":"Rua Goiânia, 22","neighborhood":"Flamboyant","city":"Coxim","fee":7.50}'::jsonb,
    35.36, 'pix', 'pendente', now() - interval '8 minutes'),

  ('Eduardo Silva', '(67) 99210-8899',
    '[{"productId":"prd-sabao-po","productName":"Sabão em Pó Omo 1kg","quantity":2,"price":14.90},{"productId":"prd-amaciante","productName":"Amaciante Comfort 2L","quantity":1,"price":22.90},{"productId":"prd-alcool","productName":"Álcool em Gel 500g","quantity":1,"price":8.90}]'::jsonb,
    '{"address":"Rua Mato Grosso, 410","neighborhood":"Centro","city":"Coxim","fee":6.00}'::jsonb,
    67.60, 'dinheiro', 'entregue', now() - interval '2 days')
) AS v(customer_name, customer_phone, items, delivery, total, payment_method, status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.orders WHERE customer_phone = v.customer_phone);-- =========================================================
-- 1) FUNÇÕES de baixa/devolução de estoque
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_stock_delta(_items jsonb, _direction int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item record;
BEGIN
  -- _direction = -1 => debita estoque ; +1 => devolve estoque
  FOR item IN
    SELECT
      (value->>'productId')::text AS pid,
      COALESCE((value->>'quantity')::int, 0) AS qty
    FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    IF item.pid IS NOT NULL AND item.qty > 0 THEN
      UPDATE public.products
         SET stock = GREATEST(0, stock + (_direction * item.qty))
       WHERE id = item.pid;
    END IF;
  END LOOP;
END;
$$;

-- =========================================================
-- 2) TRIGGER: baixa no INSERT, devolve/rebaixa no UPDATE de status
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Pedido novo: baixa estoque, exceto se já vier cancelado
    IF NEW.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(NEW.items, -1);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status mudou para cancelado => devolve
    IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(OLD.items, +1);
    -- Saiu de cancelado para outro status => rebaixa
    ELSIF OLD.status = 'cancelado' AND NEW.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.apply_stock_delta(NEW.items, -1);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock ON public.orders;
CREATE TRIGGER trg_orders_stock
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_stock();

-- =========================================================
-- 3) Bloquear EXECUTE público das funções utilitárias
-- =========================================================
REVOKE ALL ON FUNCTION public.apply_stock_delta(jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_order_stock() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 4) Habilitar Realtime para products e orders
-- =========================================================
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.orders   REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.products';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings';
  END IF;
END $$;-- TESTE 1: insere pedido e verifica baixa
DO $$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_arroz_before int;
  v_feijao_before int;
  v_arroz_after int;
  v_feijao_after int;
  v_arroz_canceled int;
  v_feijao_canceled int;
BEGIN
  SELECT stock INTO v_arroz_before FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_before FROM products WHERE id = 'prd-feijao';

  INSERT INTO public.orders (id, customer_name, customer_phone, items, total, payment_method, status)
  VALUES (
    v_order_id,
    'TESTE STOCK TRIGGER',
    '(00) 00000-0000',
    '[{"productId":"prd-arroz","productName":"Arroz Tio João 5kg","quantity":3,"price":24.90},
      {"productId":"prd-feijao","productName":"Feijão Carioca 1kg","quantity":5,"price":9.90}]'::jsonb,
    121.20, 'pix', 'pendente'
  );

  SELECT stock INTO v_arroz_after FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_after FROM products WHERE id = 'prd-feijao';

  RAISE NOTICE 'BAIXA -> Arroz: % -> % (esperado %), Feijão: % -> % (esperado %)',
    v_arroz_before, v_arroz_after, v_arroz_before - 3,
    v_feijao_before, v_feijao_after, v_feijao_before - 5;

  IF v_arroz_after <> v_arroz_before - 3 OR v_feijao_after <> v_feijao_before - 5 THEN
    RAISE EXCEPTION 'FALHA na baixa de estoque!';
  END IF;

  -- Cancela e verifica devolução
  UPDATE public.orders SET status = 'cancelado' WHERE id = v_order_id;
  SELECT stock INTO v_arroz_canceled FROM products WHERE id = 'prd-arroz';
  SELECT stock INTO v_feijao_canceled FROM products WHERE id = 'prd-feijao';

  RAISE NOTICE 'DEVOLUÇÃO -> Arroz: % (esperado %), Feijão: % (esperado %)',
    v_arroz_canceled, v_arroz_before, v_feijao_canceled, v_feijao_before;

  IF v_arroz_canceled <> v_arroz_before OR v_feijao_canceled <> v_feijao_before THEN
    RAISE EXCEPTION 'FALHA na devolução de estoque!';
  END IF;

  -- limpa pedido de teste
  DELETE FROM public.orders WHERE id = v_order_id;
  RAISE NOTICE 'TRIGGER OK';
END $$;-- =============================================================
-- Push notifications — schema + trigger
-- =============================================================
-- 1. Tabela device_tokens: armazena tokens FCM/APNs por dispositivo
-- 2. RLS: usuário só mexe nos próprios tokens
-- 3. Trigger AFTER INSERT em orders → invoca a Edge Function
--    `send-push-notification` via http (extensão pg_net)
-- =============================================================

-- Garante que pg_net está disponível (já é padrão em projetos Supabase novos)
create extension if not exists pg_net with schema extensions;

-- ---------- 1. device_tokens ----------
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
create index if not exists device_tokens_token_idx on public.device_tokens (token);

alter table public.device_tokens enable row level security;

-- Usuário só vê / escreve os próprios tokens
drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
  on public.device_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (edge functions com privilégio) lê todos os tokens para enviar push
drop policy if exists "Service role reads all tokens" on public.device_tokens;
create policy "Service role reads all tokens"
  on public.device_tokens
  for select
  to service_role
  using (true);

-- ---------- 2. Função que invoca a Edge Function ----------
-- A função usa pg_net.http_post para chamar a Edge Function `send-push-notification`.
-- Os "settings" abaixo são lidos das GUCs do projeto — você precisa configurá-los
-- via SQL no Dashboard (instruções em PUSH_SETUP.md):
--   alter database postgres set "app.supabase_url" = 'https://<seu-projeto>.supabase.co';
--   alter database postgres set "app.service_role_key" = '<service_role_key>';

create or replace function public.notify_admins_of_new_order()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  supabase_url text := current_setting('app.supabase_url', true);
  service_key text  := current_setting('app.service_role_key', true);
  function_url text;
begin
  -- Se as GUCs não estão configuradas, não faz nada (trigger no-op).
  -- Isso evita quebrar inserts em ambientes que ainda não configuraram push.
  if supabase_url is null or service_key is null then
    return new;
  end if;

  function_url := supabase_url || '/functions/v1/send-push-notification';

  perform extensions.http_post(
    url := function_url,
    body := jsonb_build_object(
      'orderId',       new.id,
      'customerName',  new.customer_name,
      'total',         new.total,
      'status',        new.status
    )::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    )::jsonb,
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- ---------- 3. Trigger ----------
drop trigger if exists trg_notify_admins_of_new_order on public.orders;
create trigger trg_notify_admins_of_new_order
  after insert on public.orders
  for each row
  execute function public.notify_admins_of_new_order();
-- Adiciona suporte a preço de atacado (varejo em quantidade)
-- wholesale_price: preço por unidade quando atinge quantidade mínima
-- wholesale_min_qty: quantidade mínima para ativar preço de atacado
-- wholesale_active: admin pode ativar/desativar por produto

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_min_qty integer,
  ADD COLUMN IF NOT EXISTS wholesale_active boolean NOT NULL DEFAULT false;
-- =============================================================
-- Push notification para CLIENTE quando status do pedido muda
-- =============================================================
-- Trigger AFTER UPDATE em orders: se status mudou, invoca a
-- Edge Function `notify-order-status` via pg_net.
-- =============================================================

create or replace function public.notify_customer_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  supabase_url text := current_setting('app.supabase_url', true);
  service_key text  := current_setting('app.service_role_key', true);
  function_url text;
begin
  -- Só dispara se o status realmente mudou
  if old.status = new.status then
    return new;
  end if;

  -- Se as GUCs não estão configuradas, não faz nada
  if supabase_url is null or service_key is null then
    return new;
  end if;

  function_url := supabase_url || '/functions/v1/notify-order-status';

  perform extensions.http_post(
    url := function_url,
    body := jsonb_build_object(
      'orderId',       new.id,
      'userId',        new.user_id,
      'customerName',  new.customer_name,
      'status',        new.status,
      'oldStatus',     old.status
    )::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    )::jsonb,
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_customer_order_status on public.orders;
create trigger trg_notify_customer_order_status
  after update on public.orders
  for each row
  execute function public.notify_customer_order_status();
