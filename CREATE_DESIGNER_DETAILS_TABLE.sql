-- Run this in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/wxbjunhkvhhfzvtaeypg/sql/new

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create designer_details table (exact schema as provided)
CREATE TABLE public.designer_details (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  email text not null,
  profile_pic text null,
  specialization text null,
  studio text null,
  phone text null,
  address text null,
  experience text null,
  gst_id text null,
  about text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint designer_details_pkey primary key (id),
  constraint designer_details_user_id_unique unique (user_id),
  constraint designer_details_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

-- Create trigger for auto-updating updated_at
create trigger update_designer_details_updated_at BEFORE
update on designer_details for EACH row
execute FUNCTION update_updated_at_column ();

-- Enable Row Level Security
ALTER TABLE designer_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own designer details" ON designer_details;
DROP POLICY IF EXISTS "Users can insert own designer details" ON designer_details;
DROP POLICY IF EXISTS "Users can update own designer details" ON designer_details;

-- Create RLS policies
CREATE POLICY "Users can read own designer details"
  ON designer_details FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own designer details"
  ON designer_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designer details"
  ON designer_details FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS designer_details_user_id_idx ON designer_details(user_id);
CREATE INDEX IF NOT EXISTS designer_details_email_idx ON designer_details(email);
