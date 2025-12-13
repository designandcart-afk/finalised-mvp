-- Enhanced project_design_estimates table with detailed line items
-- Run this in Supabase SQL Editor

-- First, let's add new columns to support detailed breakdown
ALTER TABLE project_design_estimates 
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2) DEFAULT 0;

-- Update existing records with sample line items structure
-- This shows the format for the detailed quote breakdown

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
subtotal = 13250,
discount_percentage = 25.00,
discount_amount = 3250,
final_amount = 10000,
total_amount = 11800  -- After GST
WHERE estimate_type = 'rough' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';

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
total_amount = 17300  -- After GST
WHERE estimate_type = 'initial' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';

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
total_amount = 16726  -- After GST
WHERE estimate_type = 'final' AND project_id = 'e35954c0-38f8-4480-bb90-c09f3e12e145';

-- Verify the updates
SELECT 
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