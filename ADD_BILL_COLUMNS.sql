-- Add columns for bill functionality to project_quotes_bills table
-- Run this in Supabase SQL Editor

-- Add order_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_quotes_bills' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.project_quotes_bills 
    ADD COLUMN order_id uuid REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add amount column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_quotes_bills' AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.project_quotes_bills 
    ADD COLUMN amount numeric(10,2);
  END IF;
END $$;

-- Create index on order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_quotes_bills_order_id 
ON public.project_quotes_bills(order_id);

-- Create index on project_id and document_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_quotes_bills_project_type 
ON public.project_quotes_bills(project_id, document_type);
