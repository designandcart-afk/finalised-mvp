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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_specialization_idx ON profiles(specialization);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Update RLS policies for profiles
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
