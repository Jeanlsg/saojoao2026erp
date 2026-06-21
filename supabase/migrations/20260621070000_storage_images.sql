-- Atualiza imagens para usar Supabase Storage público.
-- As URLs precisam apontar para o bucket "produtos" criado pelo script de upload.
-- Formato: https://<project-ref>.supabase.co/storage/v1/object/public/produtos/produtos/<filename>

UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/milho.jpg'          WHERE id = 'prd-milho';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/pamonha.jpg'        WHERE id = 'prd-pamonha';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/canjica.jpg'        WHERE id = 'prd-canjica';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/mugunza.jpg'        WHERE id = 'prd-mugunza';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/bolo-milho.jpg'     WHERE id = 'prd-bolo-milho';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/bolo-macaxeira.jpg' WHERE id = 'prd-bolo-maca';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/arroz-doce.jpg'     WHERE id = 'prd-arroz-doce';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/cachorro-quente.jpg' WHERE id = 'prd-cachorro';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/algodao-doce.jpg'   WHERE id = 'prd-algodao';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/pipoca.jpg'         WHERE id = 'prd-pipoca';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/caldo.jpg'          WHERE id = 'prd-caldo';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/crepe.jpg'          WHERE id = 'prd-crepe';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/batata.jpg'         WHERE id = 'prd-batata';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/espetinho.jpg'      WHERE id = 'prd-espetinho';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/budweiser.jpg'      WHERE id = 'prd-budweiser';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/brahma-skol.jpg'    WHERE id = 'prd-brahma-skol';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/refri-200.jpg'      WHERE id = 'prd-refri-200';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/coca-350.jpg'       WHERE id = 'prd-coca-350';
UPDATE public.products SET image = 'https://joygvdgiamgpjeqebzcm.supabase.co/storage/v1/object/public/produtos/produtos/agua.jpg'           WHERE id = 'prd-agua';