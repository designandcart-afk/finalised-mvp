-- Migrate existing paid orders to project_quotes_bills table
-- This will create bill records for all orders that don't have bills yet
-- Run this in Supabase SQL Editor AFTER running FIX_BILLS_RLS.sql

-- First, let's see what orders exist without bills
SELECT 
  o.id as order_id,
  (o.project_ids[1])::uuid as project_id,
  o.amount,
  o.status,
  o.created_at
FROM orders o
WHERE o.status = 'paid'
  AND o.project_ids IS NOT NULL 
  AND array_length(o.project_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM project_quotes_bills pb 
    WHERE pb.order_id = o.id
  )
ORDER BY o.created_at DESC;

-- Now insert bill records for these orders
INSERT INTO project_quotes_bills (
  project_id,
  document_type,
  file_name,
  file_url,
  order_id,
  amount,
  created_at
)
SELECT 
  (o.project_ids[1])::uuid as project_id,
  'bill' as document_type,
  CONCAT('BILL-', UPPER(SUBSTRING(o.id::text, 1, 8)), '.pdf') as file_name,
  '#' as file_url,
  o.id as order_id,
  o.amount,
  o.created_at
FROM orders o
WHERE o.status = 'paid'
  AND o.project_ids IS NOT NULL 
  AND array_length(o.project_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM project_quotes_bills pb 
    WHERE pb.order_id = o.id
  );

-- Verify the migration
SELECT 
  COUNT(*) as total_bills,
  COUNT(DISTINCT project_id) as projects_with_bills,
  SUM(amount) as total_bill_amount
FROM project_quotes_bills
WHERE document_type = 'bill';
