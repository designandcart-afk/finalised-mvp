-- Create meeting_summaries table
create table meeting_summaries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references projects(id) on delete cascade not null,
  meeting_name text not null,
  meeting_date date not null,
  mom_points jsonb not null, -- Array of meeting minutes points
  status text check (status in ('pending', 'approved', 'changes_needed')) default 'pending' not null,
  client_feedback text
);

-- Enable RLS
alter table meeting_summaries enable row level security;

-- Create index for faster queries
create index meeting_summaries_project_id_idx on meeting_summaries(project_id);
create index meeting_summaries_status_idx on meeting_summaries(status);

-- Row Level Security Policies
-- Meetings are viewable by everyone (you can restrict this later based on your auth setup)
create policy "Meeting summaries are viewable by authenticated users"
  on meeting_summaries for select
  using (auth.role() = 'authenticated');

-- Allow authenticated users to update meeting status
create policy "Authenticated users can update meeting status"
  on meeting_summaries for update
  using (auth.role() = 'authenticated');

-- Allow authenticated users to insert meetings
create policy "Authenticated users can insert meetings"
  on meeting_summaries for insert
  with check (auth.role() = 'authenticated');

-- Allow authenticated users to delete meetings
create policy "Authenticated users can delete meetings"
  on meeting_summaries for delete
  using (auth.role() = 'authenticated');
