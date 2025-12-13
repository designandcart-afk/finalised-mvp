-- First, check if the tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('project_design_estimates', 'project_design_payments');

-- If they don't exist, you need to run the migration below:
-- Copy and paste the entire contents of:
-- supabase/migrations/0011_add_design_payment_tables.sql
-- into Supabase SQL Editor and run it
