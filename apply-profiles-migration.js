const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wxbjunhkvhhfzvtaeypg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Ymp1bmhrdmhoZnp2dGFleXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODc0MjYsImV4cCI6MjA3ODk2MzQyNn0.wXFdX5RUTTX0XKwUVz8UblXEyu1V5GE7DeByyfON1Is';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying profiles table migration...');

  // Add the columns if they don't exist
  const { data, error } = await supabase.rpc('apply_profiles_migration', {});

  if (error) {
    console.error('Migration failed:', error);
    console.log('\nPlease run this SQL manually in your Supabase SQL Editor:');
    console.log(`
-- Add designer profile fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT CHECK (specialization IN ('Interior Designer', 'Architect', 'Civil Engineer', 'Others')),
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS studio_company TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS profiles_specialization_idx ON profiles(specialization);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
    `);
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
