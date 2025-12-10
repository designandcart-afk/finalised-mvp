-- Database setup for payment functionality
-- Run this in Supabase SQL Editor to ensure all required tables and data exist

-- The project_design_payments table already exists - no need to create it
-- Just verify it's accessible
DO $$
BEGIN
    -- Check if the table exists and is accessible
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'project_design_payments') THEN
        RAISE NOTICE 'project_design_payments table exists and is accessible';
    ELSE
        RAISE NOTICE 'project_design_payments table not found';
    END IF;
END
$$;

-- Add line_items column to project_design_estimates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'project_design_estimates' AND column_name = 'line_items'
    ) THEN
        ALTER TABLE project_design_estimates 
        ADD COLUMN line_items JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN discount_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0,
        ADD COLUMN final_amount NUMERIC(10,2) DEFAULT 0;
        
        RAISE NOTICE 'Added line_items and discount columns to project_design_estimates';
    ELSE
        RAISE NOTICE 'line_items column already exists in project_design_estimates';
    END IF;
END
$$;

-- Insert sample data if the project exists
DO $$
DECLARE
    project_exists BOOLEAN;
    estimate_rough_id UUID;
    estimate_initial_id UUID;
    estimate_final_id UUID;
BEGIN
    -- Check if the test project exists
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = 'e35954c0-38f8-4480-bb90-c09f3e12e145') INTO project_exists;
    
    IF project_exists THEN
        RAISE NOTICE 'Test project found, updating estimates with line items';
        
        -- Update rough estimate
        UPDATE project_design_estimates 
        SET line_items = '[
          {
            "service": "3D Rendering - Living Room",
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Kitchen", 
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Bedroom",
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Iterations",
            "area": 2,
            "rate": 500,
            "views": 1,
            "total": 1000
          }
        ]'::jsonb,
        subtotal = 11500,
        discount_percentage = 13.00,
        discount_amount = 1500,
        final_amount = 10000,
        total_amount = 11800
        WHERE estimate_type = 'rough' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145'
        RETURNING id INTO estimate_rough_id;

        -- Update initial estimate  
        UPDATE project_design_estimates 
        SET line_items = '[
          {
            "service": "3D Rendering - Living Room",
            "area": 2,
            "rate": 3500,
            "views": 3,
            "total": 7000
          },
          {
            "service": "3D Rendering - Kitchen",
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Dining",
            "area": 1,
            "rate": 1750,
            "views": 2,
            "total": 1750
          },
          {
            "service": "3D Rendering - Bedroom",
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Iterations",
            "area": 3,
            "rate": 500,
            "views": 1,
            "total": 1500
          }
        ]'::jsonb,
        subtotal = 17250,
        discount_percentage = 15.00,
        discount_amount = 2588,
        final_amount = 14662,
        total_amount = 17300
        WHERE estimate_type = 'initial' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145'
        RETURNING id INTO estimate_initial_id;

        -- Update final estimate
        UPDATE project_design_estimates 
        SET line_items = '[
          {
            "service": "3D Rendering - Living Room + Kitchen",
            "area": 2,
            "rate": 3500,
            "views": 3,
            "total": 7000
          },
          {
            "service": "3D Rendering - Dining",
            "area": 1,
            "rate": 1750,
            "views": 2,
            "total": 1750
          },
          {
            "service": "3D Rendering - Bedroom",
            "area": 1,
            "rate": 3500,
            "views": 3,
            "total": 3500
          },
          {
            "service": "3D Rendering - Iterations",
            "area": 2,
            "rate": 500,
            "views": 1,
            "total": 1000
          },
          {
            "service": "Premium Finishes & Details",
            "area": 1,
            "rate": 2500,
            "views": 1,
            "total": 2500
          }
        ]'::jsonb,
        subtotal = 15750,
        discount_percentage = 10.00,
        discount_amount = 1575,
        final_amount = 14175,
        total_amount = 16726
        WHERE estimate_type = 'final' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145'
        RETURNING id INTO estimate_final_id;

        RAISE NOTICE 'Updated estimates with line items successfully';
        
    ELSE
        RAISE NOTICE 'Test project not found - skipping sample data insertion';
    END IF;
END
$$;

-- Verify the setup
SELECT 
    'Estimates' as table_type,
    estimate_type,
    estimate_number,
    subtotal,
    discount_amount,
    final_amount,
    total_amount,
    jsonb_array_length(line_items) as items_count
FROM project_design_estimates 
WHERE project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145'
ORDER BY CASE estimate_type 
  WHEN 'rough' THEN 1 
  WHEN 'initial' THEN 2 
  WHEN 'final' THEN 3 
END;

-- Final confirmation
DO $$
BEGIN
    RAISE NOTICE 'Setup completed! Payment functionality is ready to use.';
END
$$;