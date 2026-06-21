-- Adiciona suporte a promoção por produto individual
-- promo_price: preço promocional (NULL = sem promoção)
-- show_in_offers: se deve aparecer na seção Ofertas Especiais

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promo_price numeric,
  ADD COLUMN IF NOT EXISTS show_in_offers boolean NOT NULL DEFAULT false;
