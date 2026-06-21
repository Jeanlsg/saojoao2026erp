
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
