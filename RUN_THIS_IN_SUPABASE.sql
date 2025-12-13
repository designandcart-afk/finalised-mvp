-- Apply this SQL in your Supabase SQL Editor
-- URL: https://wxbjunhkvhhfzvtaeypg.supabase.co/project/wxbjunhkvhhfzvtaeypg/sql

-- Add designer profile fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT CHECK (specialization IN ('Interior Designer', 'Architect', 'Civil Engineer', 'Others')),
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS studio_company TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS profile_pic TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS profiles_specialization_idx ON profiles(specialization);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Enable RLS policies for profiles (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
