-- Fix RLS policies for project_design_estimates table
-- Run this in Supabase SQL Editor

-- First, let's see what RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'project_design_estimates';

-- Check current data visibility
SELECT COUNT(*) as total_estimates FROM project_design_estimates;
SELECT COUNT(*) as project_estimates FROM project_design_estimates WHERE project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';

-- Let's check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'project_design_estimates';

-- Temporarily disable RLS to test (ONLY FOR TESTING - re-enable after)
-- ALTER TABLE project_design_estimates DISABLE ROW LEVEL SECURITY;

-- Or create a proper policy that allows reading estimates for project owners
-- First drop existing policies if any
DROP POLICY IF EXISTS "Users can read their project estimates" ON project_design_estimates;

-- Create new policy for reading estimates
CREATE POLICY "Users can read their project estimates" ON project_design_estimates
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Create policy for inserting estimates (for admin/service role)
DROP POLICY IF EXISTS "Service role can insert estimates" ON project_design_estimates;
CREATE POLICY "Service role can insert estimates" ON project_design_estimates
    FOR INSERT WITH CHECK (true);

-- Create policy for updating estimates
DROP POLICY IF EXISTS "Service role can update estimates" ON project_design_estimates;  
CREATE POLICY "Service role can update estimates" ON project_design_estimates
    FOR UPDATE USING (true);

-- Test the policies
SELECT 'Testing policies...' as status;
SELECT id, estimate_type, estimate_number FROM project_design_estimates WHERE project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';