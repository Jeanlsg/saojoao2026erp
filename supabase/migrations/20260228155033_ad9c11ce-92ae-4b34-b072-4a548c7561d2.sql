
ALTER TABLE public.combos ADD COLUMN discount_percent numeric NOT NULL DEFAULT 0;

-- Migrate existing data: calculate discount percent from original/promo prices
UPDATE public.combos SET discount_percent = ROUND(((original_price - promo_price) / NULLIF(original_price, 0)) * 100, 1) WHERE original_price > 0;

-- Remove old price columns
ALTER TABLE public.combos DROP COLUMN original_price;
ALTER TABLE public.combos DROP COLUMN promo_price;
