-- TalaStudio: phase 1 schema (draft for review before running)
-- Collections, products, images, private pricing, leads, catalog requests.
-- Row Level Security is enabled on every table.

-- Staff roles -------------------------------------------------------------

create type staff_role as enum ('owner', 'approver');

create table staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role staff_role not null,
  created_at timestamptz not null default now()
);

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

-- Collections and products ------------------------------------------------

create type room_type as enum ('bedroom', 'living', 'dining', 'other');

create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  room room_type not null,
  description text,
  hero_image_path text,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  collection_id uuid not null references collections (id),
  slug text unique not null,
  name text not null,
  description text,
  width_cm numeric,
  depth_cm numeric,
  height_cm numeric,
  materials text[],
  finishes text[],
  carton_length_cm numeric,
  carton_width_cm numeric,
  carton_height_cm numeric,
  carton_weight_kg numeric,
  cbm numeric,
  pieces_per_40hq int,
  moq int,
  lead_time_days int,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  image_path text not null,
  is_watermarked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Prices are private and never readable by the public.
create table product_pricing (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  fob_usd numeric not null,
  valid_from date not null default current_date,
  created_at timestamptz not null default now()
);

-- Leads and catalog requests ----------------------------------------------

create type lead_stage as enum (
  'contacted', 'replied', 'catalog_sent', 'call', 'sample', 'quote', 'won', 'lost'
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  email text,
  phone text,
  country text,
  buyer_type text,          -- retailer, buying group, distributor, other
  source text,              -- outreach, website, linkedin, instagram, pinterest, referral
  stage lead_stage not null default 'contacted',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company text not null,
  email text not null,
  phone text,
  country text,
  buyer_type text,
  message text,
  lead_id uuid references leads (id),
  created_at timestamptz not null default now()
);

-- Row Level Security --------------------------------------------------------

alter table staff enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_pricing enable row level security;
alter table leads enable row level security;
alter table catalog_requests enable row level security;

-- Staff can manage everything in phase 1.
create policy staff_read_staff on staff for select using (is_staff());
create policy staff_all_collections on collections for all using (is_staff()) with check (is_staff());
create policy staff_all_products on products for all using (is_staff()) with check (is_staff());
create policy staff_all_images on product_images for all using (is_staff()) with check (is_staff());
create policy staff_all_pricing on product_pricing for all using (is_staff()) with check (is_staff());
create policy staff_all_leads on leads for all using (is_staff()) with check (is_staff());
create policy staff_read_requests on catalog_requests for select using (is_staff());

-- The public website can read published items only.
create policy public_read_collections on collections
  for select using (is_published);

create policy public_read_products on products
  for select using (is_published);

create policy public_read_images on product_images
  for select using (
    exists (select 1 from products p where p.id = product_id and p.is_published)
  );

-- The website form can submit catalog requests but not read them.
create policy public_insert_requests on catalog_requests
  for insert with check (true);

-- No public policy on product_pricing or leads: they stay private.
