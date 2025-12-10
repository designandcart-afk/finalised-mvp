-- Insert test quotes for the project
-- Run this in Supabase SQL Editor to bypass RLS

-- First, let's check if the table exists and what the current data looks like
SELECT 'Checking existing estimates...' as status;
SELECT * FROM project_design_estimates WHERE project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';

-- Insert test estimates (bypasses RLS when run as admin in Supabase dashboard)
INSERT INTO project_design_estimates (
  project_id,
  estimate_type,
  estimate_number,
  scope,
  areas_count,
  iterations_count,
  options_count,
  base_amount,
  per_area_amount,
  per_iteration_amount,
  per_option_amount,
  subtotal,
  gst_percentage,
  gst_amount,
  total_amount,
  status,
  notes
) VALUES 
-- Rough Estimate
(
  'e35954c0-38f8-4480-bb90-c09f3e12e145',
  'rough',
  'EST-ROUGH-001',
  'Initial concept design consultation',
  1,
  2,
  3,
  25000.00,
  0.00,
  0.00,
  0.00,
  25000.00,
  18.00,
  4500.00,
  29500.00,
  'active',
  'Rough concept phase with basic design ideas'
),
-- Initial Estimate  
(
  'e35954c0-38f8-4480-bb90-c09f3e12e145',
  'initial',
  'EST-INITIAL-001',
  'Detailed design with iterations',
  1,
  3,
  5,
  35000.00,
  0.00,
  0.00,
  0.00,
  35000.00,
  18.00,
  6300.00,
  41300.00,
  'active',
  'Detailed design phase with multiple iterations'
),
-- Final Estimate
(
  'e35954c0-38f8-4480-bb90-c09f3e12e145',
  'final',
  'EST-FINAL-001',
  'Complete design with all deliverables',
  1,
  3,
  8,
  45000.00,
  0.00,
  0.00,
  0.00,
  45000.00,
  18.00,
  8100.00,
  53100.00,
  'active',
  'Final design phase with complete deliverables'
);

-- Verify the inserts worked
SELECT 'Verifying inserts...' as status;
SELECT id, estimate_type, estimate_number, total_amount, status 
FROM project_design_estimates 
WHERE project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145'
ORDER BY 
  CASE estimate_type 
    WHEN 'rough' THEN 1 
    WHEN 'initial' THEN 2 
    WHEN 'final' THEN 3 
  END;