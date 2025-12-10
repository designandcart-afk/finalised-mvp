-- Fix RLS policies for project_quotes_bills table to allow bill creation
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'project_quotes_bills';

-- If RLS is enabled, we need policies for INSERT
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own bills" ON project_quotes_bills;
DROP POLICY IF EXISTS "Users can view their own bills" ON project_quotes_bills;

-- Enable RLS if not already enabled
ALTER TABLE project_quotes_bills ENABLE ROW LEVEL SECURITY;

-- Allow users to insert bills for their own projects
CREATE POLICY "Users can insert bills for their projects"
ON project_quotes_bills
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Allow users to view bills for their own projects
CREATE POLICY "Users can view bills for their projects"
ON project_quotes_bills
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT INSERT, SELECT ON project_quotes_bills TO authenticated;
