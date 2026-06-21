-- Separa o produto 'Cerveja (Brahma ou Skol)' em dois produtos distintos:
-- - Cerveja Brahma (id prd-brahma-skol renomeado)
-- - Cerveja Skol (novo id prd-skol)

-- 1) Renomeia o produto atual para ser só Brahma
UPDATE public.products
SET name = 'Cerveja Brahma',
    description = 'Cerveja Brahma long neck 330ml',
    image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/brahma-skol.jpg'
WHERE id = 'prd-brahma-skol';

-- 2) Cria o novo produto Skol (a imagem é atualizada depois pelo script de upload)
INSERT INTO public.products (id, name, description, price, stock, unit, image, category_id, show_in_offers)
VALUES (
  'prd-skol',
  'Cerveja Skol',
  'Cerveja Skol long neck 330ml',
  7.00,
  300,
  'un',
  'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/skol.jpg',
  'cat-bebidas',
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image;