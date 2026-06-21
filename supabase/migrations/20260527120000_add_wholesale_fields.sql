-- Adiciona suporte a preço de atacado (varejo em quantidade)
-- wholesale_price: preço por unidade quando atinge quantidade mínima
-- wholesale_min_qty: quantidade mínima para ativar preço de atacado
-- wholesale_active: admin pode ativar/desativar por produto

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS wholesale_min_qty integer,
  ADD COLUMN IF NOT EXISTS wholesale_active boolean NOT NULL DEFAULT false;
