-- Migration to update project status values
-- Old values: wip, screenshots_shared, approved, renders_shared, delivering, delivered
-- New values: in_progress, on_hold, designs_shared, approved, ordered, closed

-- Step 1: Drop the existing check constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Step 2: Update existing data to new status values
UPDATE projects SET status = 'in_progress' WHERE status = 'wip';
UPDATE projects SET status = 'designs_shared' WHERE status IN ('screenshots_shared', 'renders_shared');
UPDATE projects SET status = 'ordered' WHERE status = 'delivering';
UPDATE projects SET status = 'closed' WHERE status = 'delivered';
-- 'approved' stays the same

-- Step 3: Add new check constraint with updated values
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('in_progress', 'on_hold', 'designs_shared', 'approved', 'ordered', 'closed'));

-- Step 4: Update default value
ALTER TABLE projects 
ALTER COLUMN status SET DEFAULT 'in_progress';

-- Optional: Add comment to document the status values
COMMENT ON COLUMN projects.status IS 'Project status: in_progress (default), on_hold, designs_shared, approved, ordered, closed';
