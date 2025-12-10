# Project Status Update Summary

## New Status Values

The project status system has been updated to use the following values:

1. **in_progress** - Project is currently being worked on (replaces "wip")
2. **on_hold** - Project temporarily paused
3. **designs_shared** - Designs/renders have been shared with client (replaces "screenshots_shared" and "renders_shared")
4. **approved** - Client has approved the designs
5. **ordered** - Products/materials have been ordered (replaces "delivering")
6. **closed** - Project completed and delivered (replaces "delivered")

## Database Migration

**File:** `/supabase/migrations/0006_update_project_status_values.sql`

To apply this migration to your Supabase database:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase Dashboard > SQL Editor
```

The migration will:
1. Drop the old status constraint
2. Migrate existing data:
   - `wip` → `in_progress`
   - `screenshots_shared`, `renders_shared` → `designs_shared`
   - `delivering` → `ordered`
   - `delivered` → `closed`
   - `approved` stays the same
3. Add new constraint with updated values
4. Set default to `in_progress`

## Files Updated

1. **Dashboard Filter** - `/app/page.tsx`
   - Updated dropdown options to show new status values

2. **Demo Data** - `/lib/demoData.ts`
   - Updated demo projects to use new status values

3. **Database Schema** - `/supabase/migrations/0001_initial_schema.sql`
   - Updated for reference (new projects will use this)

4. **Migration File** - `/supabase/migrations/0006_update_project_status_values.sql`
   - Safely migrates existing data to new status values

## Display Labels

In the UI, these values are displayed as:
- `in_progress` → "In Progress"
- `on_hold` → "On Hold"
- `designs_shared` → "Designs Shared"
- `approved` → "Approved"
- `ordered` → "Ordered"
- `closed` → "Closed"
