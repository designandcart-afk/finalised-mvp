-- Update orders table to support Razorpay payment integration
-- Migration: 0010_update_orders_for_razorpay.sql

-- Add Razorpay payment fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Rename columns to match API expectations (if they don't exist with new names)
-- Add user_id if it doesn't exist (referencing auth.users)
DO $$ 
BEGIN
  -- Check if user_id column exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'user_id') THEN
    -- Add user_id column
    ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Copy data from client_id to user_id if client_id exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'client_id') THEN
      UPDATE orders SET user_id = client_id WHERE user_id IS NULL;
    END IF;
  END IF;

  -- Check if amount column exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'amount') THEN
    ALTER TABLE orders ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0);
    
    -- Copy data from total_amount to amount if total_amount exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
      UPDATE orders SET amount = total_amount WHERE amount = 0;
    END IF;
  END IF;

  -- Add items column if it doesn't exist (to store order items as JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'items') THEN
    ALTER TABLE orders ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add project_ids column if it doesn't exist (to store multiple project IDs)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'project_ids') THEN
    ALTER TABLE orders ADD COLUMN project_ids UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'currency') THEN
    ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'INR';
  END IF;
END $$;

-- Update status check constraint to include 'paid' status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled', 'failed'));

-- Create indexes for Razorpay fields
CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS orders_razorpay_payment_id_idx ON orders(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);

-- Update RLS policies for orders table
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Update invoice trigger to work with new status value
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON orders;
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

CREATE TRIGGER trigger_set_invoice_number
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();
