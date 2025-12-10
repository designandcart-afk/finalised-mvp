-- Seed script to add sample screenshots and renders
-- Replace PROJECT_ID_HERE with your actual project ID
-- Replace USER_ID_HERE with your actual user ID (optional)

-- Sample screenshots for Living Room
INSERT INTO project_screenshots (project_id, area, image_url, approval_status)
VALUES 
  ('PROJECT_ID_HERE', 'Living Room', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_1', 'pending'),
  ('PROJECT_ID_HERE', 'Living Room', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_2', 'pending');

-- Sample screenshots for Dining
INSERT INTO project_screenshots (project_id, area, image_url, approval_status)
VALUES 
  ('PROJECT_ID_HERE', 'Dining', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_3', 'pending');

-- Sample renders for Living Room
INSERT INTO project_renders (project_id, area, image_url, approval_status)
VALUES 
  ('PROJECT_ID_HERE', 'Living Room', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_4', 'pending'),
  ('PROJECT_ID_HERE', 'Living Room', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_5', 'pending');

-- Sample renders for Dining
INSERT INTO project_renders (project_id, area, image_url, approval_status)
VALUES 
  ('PROJECT_ID_HERE', 'Dining', 'https://drive.google.com/uc?export=view&id=1XQ9kCGqV_7UW8pL3jJh6SAMPLE_FILE_ID_6', 'pending');

-- To run this script:
-- 1. Get your project ID from the URL (e.g., http://localhost:4000/projects/YOUR_PROJECT_ID)
-- 2. Replace all instances of PROJECT_ID_HERE with your actual project ID
-- 3. Replace the SAMPLE_FILE_ID_X with actual Google Drive file IDs
-- 4. Run this in your Supabase SQL Editor or using supabase db execute
