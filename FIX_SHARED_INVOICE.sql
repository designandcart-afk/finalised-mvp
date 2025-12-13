-- Fix: Orders with same razorpay_order_id should share the same invoice number
-- Run this in Supabase SQL Editor

-- Step 1: Remove the unique constraint on invoice_number
-- Multiple orders should be able to share the same invoice number
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_invoice_number_key;

-- Step 2: Update the trigger function to NOT auto-generate invoice numbers
-- The API will handle invoice number generation to avoid race conditions
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  -- The trigger now does nothing - invoice numbers are set by the API
  -- This prevents race conditions when multiple orders are updated simultaneously
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optionally: Fix existing orders that were paid together but have different invoices
-- Uncomment the following block if you want to consolidate existing duplicate invoices

/*
DO $$
DECLARE
  payment_group RECORD;
  first_invoice TEXT;
BEGIN
  -- For each razorpay_order_id that has multiple different invoice numbers
  FOR payment_group IN 
    SELECT razorpay_order_id, MIN(invoice_number) as first_invoice
    FROM orders 
    WHERE status = 'paid' 
      AND invoice_number IS NOT NULL
      AND razorpay_order_id IS NOT NULL
    GROUP BY razorpay_order_id
    HAVING COUNT(DISTINCT invoice_number) > 1
  LOOP
    -- Update all orders with this razorpay_order_id to use the same (earliest) invoice number
    UPDATE orders
    SET invoice_number = payment_group.first_invoice
    WHERE razorpay_order_id = payment_group.razorpay_order_id
      AND status = 'paid';
    
    RAISE NOTICE 'Consolidated invoice % for payment %', payment_group.first_invoice, payment_group.razorpay_order_id;
  END LOOP;
END $$;
*/
