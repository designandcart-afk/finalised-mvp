-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table projects enable row level security;
alter table products enable row level security;
alter table project_products enable row level security;
alter table messages enable row level security;
alter table files enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Create tables
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text unique not null,
  full_name text,
  role text check (role in ('designer', 'client', 'admin')) default 'client' not null
);

create table projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  scope text check (scope in ('1BHK', '2BHK', '3BHK', 'Commercial')) not null,
  status text check (status in ('in_progress', 'on_hold', 'designs_shared', 'approved', 'ordered', 'closed')) default 'in_progress' not null,
  address text not null,
  notes text,
  client_id uuid references profiles(id) on delete cascade not null,
  designer_id uuid references profiles(id) on delete set null
);

create table products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  price decimal(10,2) not null check (price >= 0),
  category text not null,
  color text,
  image_url text not null,
  status text check (status in ('active', 'inactive', 'deleted')) default 'active' not null
);

create table project_products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references projects(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  area text not null,
  notes text
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references projects(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  attachments jsonb,
  meeting_info jsonb
);

create table files (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  size bigint not null,
  mime_type text not null,
  url text not null,
  thumbnail_url text,
  project_id uuid references projects(id) on delete cascade not null,
  uploader_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('image', 'file')) not null
);

create table orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  status text check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) default 'pending' not null,
  total_amount decimal(10,2) not null check (total_amount >= 0),
  payment_status text check (payment_status in ('pending', 'paid', 'failed')) default 'pending' not null,
  shipping_address jsonb not null
);

create table order_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10,2) not null check (unit_price >= 0),
  total_price decimal(10,2) not null check (total_price >= 0)
);

-- Create indexes
create index projects_client_id_idx on projects(client_id);
create index projects_designer_id_idx on projects(designer_id);
create index products_category_idx on products(category);
create index products_status_idx on products(status);
create index messages_project_id_idx on messages(project_id);
create index files_project_id_idx on files(project_id);
create index orders_client_id_idx on orders(client_id);
create index order_items_order_id_idx on order_items(order_id);

-- Row Level Security Policies
-- Profiles: viewable by the owner and admins
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id or exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Projects: viewable by clients and assigned designers
create policy "Users can view own projects"
  on projects for select
  using (
    client_id = auth.uid() or
    designer_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Products: viewable by all authenticated users
create policy "Products are viewable by all authenticated users"
  on products for select
  using (auth.role() = 'authenticated');

-- Project Products: viewable by project members
create policy "Project products are viewable by project members"
  on project_products for select
  using (
    exists (
      select 1 from projects
      where id = project_products.project_id
      and (client_id = auth.uid() or designer_id = auth.uid())
    )
  );

-- Messages: viewable by project members
create policy "Messages are viewable by project members"
  on messages for select
  using (
    exists (
      select 1 from projects
      where id = messages.project_id
      and (client_id = auth.uid() or designer_id = auth.uid())
    )
  );

-- Files: viewable by project members
create policy "Files are viewable by project members"
  on files for select
  using (
    exists (
      select 1 from projects
      where id = files.project_id
      and (client_id = auth.uid() or designer_id = auth.uid())
    )
  );

-- Orders: viewable by the client who placed them
create policy "Orders are viewable by the client"
  on orders for select
  using (client_id = auth.uid());

-- Order Items: viewable by the order owner
create policy "Order items are viewable by the order owner"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where id = order_items.order_id
      and client_id = auth.uid()
    )
  );

-- Create RPC function for creating orders
create or replace function create_order(
  order_data json,
  items_data json
) returns orders
language plpgsql
security definer
as $$
declare
  new_order orders;
  item json;
begin
  -- Insert the order
  insert into orders (
    client_id,
    project_id,
    total_amount,
    shipping_address
  )
  select
    (order_data->>'client_id')::uuid,
    (order_data->>'project_id')::uuid,
    (order_data->>'total_amount')::decimal,
    order_data->'shipping_address'
  returning * into new_order;

  -- Insert order items
  for item in select * from json_array_elements(items_data)
  loop
    insert into order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price
    ) values (
      new_order.id,
      (item->>'product_id')::uuid,
      (item->>'quantity')::integer,
      (item->>'unit_price')::decimal,
      (item->>'total_price')::decimal
    );
  end loop;

  return new_order;
end;
$$;