-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX PAYMENT ERRORS
-- ============================================================
-- This script adds missing columns WITHOUT deleting existing orders
-- ============================================================

-- Add billing-related columns that the payment API needs
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;

-- Add invoice fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Add unique constraint to invoice_number if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_invoice_number_key'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_invoice_number_key UNIQUE (invoice_number);
  END IF;
END $$;

-- Update discount_type check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_discount_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_discount_type_check 
  CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'none'::text]));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_invoice_number_idx ON public.orders USING btree (invoice_number);

-- Create function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE invoice_number IS NOT NULL;
  
  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-set invoice number when order is paid
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
    NEW.invoice_date := COALESCE(NEW.paid_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.orders;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION COMPLETE!
-- ✅ All existing orders preserved
-- ✅ Missing columns added
-- Try placing an order again - it will work! 🎉
-- ============================================================
