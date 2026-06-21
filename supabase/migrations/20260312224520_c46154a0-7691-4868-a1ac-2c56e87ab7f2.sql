CREATE TABLE public.flyers (
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
  FOR SELECT TO anon, authenticated USING (active = true);