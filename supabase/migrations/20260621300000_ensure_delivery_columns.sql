-- Garante que todas as colunas relacionadas a entrega existam em orders
-- Adiciona colunas se não existirem

DO $$
BEGIN
  -- delivery_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
  END IF;

  -- delivery_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_code'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_code TEXT;
  END IF;

  -- delivered_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivered_by'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivered_by UUID;
  END IF;

  -- delivered_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;

  -- delivered_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivered_items'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivered_items JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- table_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'table_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN table_number TEXT;
  END IF;

  -- mesa_device_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'mesa_device_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN mesa_device_id TEXT;
  END IF;
END $$;

-- Atualiza dados existentes
UPDATE public.orders
SET delivery_status = 'pending'
WHERE delivery_status IS NULL;

UPDATE public.orders
SET delivery_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE delivery_code IS NULL;
