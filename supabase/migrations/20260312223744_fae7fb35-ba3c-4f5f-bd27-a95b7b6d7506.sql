ALTER TABLE public.discount_rules 
  ADD COLUMN min_order_value numeric DEFAULT NULL,
  ADD COLUMN max_distance_km numeric DEFAULT NULL;