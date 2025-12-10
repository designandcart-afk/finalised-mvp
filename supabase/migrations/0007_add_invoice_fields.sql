-- Add invoice fields to orders table for proper billing and discount tracking
-- Migration: 0007_add_invoice_fields.sql

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS tax DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP WITH TIME ZONE;

-- Create index for invoice number lookup
CREATE INDEX IF NOT EXISTS orders_invoice_number_idx ON orders(invoice_number);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the current max invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE invoice_number IS NOT NULL;
  
  -- Format as INV-YYYYMM-XXXX
  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice number when order is paid
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
    NEW.invoice_date := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON orders;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Update existing paid orders with invoice numbers
DO $$
DECLARE
  ord RECORD;
BEGIN
  FOR ord IN SELECT id FROM orders WHERE status = 'paid' AND invoice_number IS NULL ORDER BY created_at
  LOOP
    UPDATE orders 
    SET invoice_number = generate_invoice_number(),
        invoice_date = paid_at
    WHERE id = ord.id;
  END LOOP;
END $$;
