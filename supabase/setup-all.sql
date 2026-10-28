-- TalaStudio: full setup in one file (= migrations 001 to 004, in order).
-- Paste into Supabase > SQL Editor of the NEW TalaStudio project only. Never run in another project.
-- Run once. It is not safe to run twice.

-- ===== 20261014000001_initial_schema.sql =====
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

-- ===== 20261014000002_phase1_fixes.sql =====
-- 002: phase 1 fixes (access rules, grants, watermark rule, storage, housekeeping)
-- Review notes: see 08-privacy-terms-basis.md and the schema review in the chat of 14 Oct 2026.

-- 1. Owners only ----------------------------------------------------------------
create or replace function is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = 'owner');
$$;

-- 2. Catalog requests: no direct public insert ----------------------------------
-- The website server function inserts with the service role key after the Turnstile check.
-- Without this, anyone holding the public anon key could skip Turnstile and insert directly.
drop policy if exists public_insert_requests on catalog_requests;

alter table catalog_requests
  add constraint catalog_requests_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add constraint catalog_requests_lengths check (
    char_length(full_name) <= 200 and char_length(company) <= 200 and coalesce(char_length(message), 0) <= 4000
  );

-- 3. Policies: say which role each one is for ------------------------------------
drop policy if exists staff_read_staff on staff;
drop policy if exists staff_all_collections on collections;
drop policy if exists staff_all_products on products;
drop policy if exists staff_all_images on product_images;
drop policy if exists staff_all_pricing on product_pricing;
drop policy if exists staff_all_leads on leads;
drop policy if exists staff_read_requests on catalog_requests;
drop policy if exists public_read_collections on collections;
drop policy if exists public_read_products on products;
drop policy if exists public_read_images on product_images;

create policy staff_read_staff on staff for select to authenticated using (is_staff());
create policy staff_all_collections on collections for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_all_products on products for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_all_images on product_images for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_all_leads on leads for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_read_requests on catalog_requests for select to authenticated using (is_staff());

-- Prices: owners only (Evin, David). Approvers cannot read or change prices.
create policy owner_all_pricing on product_pricing for all to authenticated using (is_owner()) with check (is_owner());

-- The public website reads published items only, and watermarked images only.
create policy public_read_collections on collections for select to anon, authenticated using (is_published);
create policy public_read_products on products for select to anon, authenticated using (is_published);
create policy public_read_images on product_images for select to anon, authenticated using (
  is_watermarked and exists (select 1 from products p where p.id = product_images.product_id and p.is_published)
);

-- 4. Explicit grants -------------------------------------------------------------
-- Nothing is exposed by default. Row Level Security still applies on top of these grants.
revoke all on all tables in schema public from anon, authenticated;
grant select on collections, products, product_images to anon;
grant select, insert, update, delete on collections, products, product_images, product_pricing, leads to authenticated;
grant select on catalog_requests, staff to authenticated;

revoke all on function is_staff(), is_owner() from public, anon;
grant execute on function is_staff(), is_owner() to authenticated;

-- 5. updated_at maintenance --------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger collections_set_updated_at before update on collections for each row execute function set_updated_at();
create trigger products_set_updated_at before update on products for each row execute function set_updated_at();
create trigger leads_set_updated_at before update on leads for each row execute function set_updated_at();

-- 6. Indexes on foreign keys and common filters ---------------------------------
create index products_collection_id_idx on products (collection_id);
create index product_images_product_id_idx on product_images (product_id);
create index product_pricing_product_id_idx on product_pricing (product_id);
create index catalog_requests_lead_id_idx on catalog_requests (lead_id);
create index catalog_requests_created_at_idx on catalog_requests (created_at desc);
create index leads_stage_idx on leads (stage);

-- 7. Storage buckets ----------------------------------------------------------------
-- public-images: watermarked images only, readable by the website.
-- private-originals and qc-photos: staff only (and buyers for their own QC photos later).
insert into storage.buckets (id, name, public) values
  ('public-images', 'public-images', true),
  ('private-originals', 'private-originals', false),
  ('qc-photos', 'qc-photos', false)
on conflict (id) do nothing;

create policy staff_manage_storage on storage.objects
  for all to authenticated
  using (bucket_id in ('public-images', 'private-originals', 'qc-photos') and public.is_staff())
  with check (bucket_id in ('public-images', 'private-originals', 'qc-photos') and public.is_staff());

-- ===== 20261014000003_content_tables.sql =====
-- 003: social content (phase 2): assets, posts and results
-- Flow: uploads -> Claude drafts -> a person edits and approves -> Metricool schedules and posts -> results saved.
-- All tables are staff only. Nothing here is readable by the public website.

create type content_channel as enum ('linkedin', 'instagram', 'pinterest');
create type content_status as enum ('draft', 'approved', 'scheduled', 'posted', 'rejected');
create type asset_kind as enum ('render', 'studio', 'material', 'teaser', 'other');

create table content_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'private-originals',
  storage_path text not null,
  kind asset_kind not null default 'other',
  is_watermarked boolean not null default false,   -- only watermarked assets can be posted
  alt_text text,
  collection_id uuid references collections (id) on delete set null,
  uploaded_by uuid references staff (user_id),
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create table content_posts (
  id uuid primary key default gen_random_uuid(),
  channel content_channel not null,
  status content_status not null default 'draft',
  title text,                                      -- internal label
  draft_body text not null,                        -- Claude's draft, kept as written
  final_body text,                                 -- the version after a person edited it
  hashtags text[] not null default '{}',
  asset_id uuid references content_assets (id) on delete set null,
  collection_id uuid references collections (id) on delete set null,
  planned_for timestamptz,
  queue_position int,                              -- when renders arrive faster than the schedule
  created_by text not null default 'claude',
  approved_by uuid references staff (user_id),
  approved_at timestamptz,
  external_post_id text,                           -- Metricool post id
  posted_url text,
  posted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nothing leaves draft without a named approver and a final text.
  constraint approved_needs_approver check (
    status in ('draft', 'rejected') or (approved_by is not null and approved_at is not null)
  ),
  constraint approved_needs_final_text check (status in ('draft', 'rejected') or final_body is not null),
  constraint scheduled_needs_date check (status not in ('scheduled', 'posted') or planned_for is not null)
);

create table content_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references content_posts (id) on delete cascade,
  captured_on date not null default current_date,
  reach int,
  engagement int,
  clicks int,
  followers_gained int,
  created_at timestamptz not null default now(),
  unique (post_id, captured_on)
);

-- Rule: every image is watermarked before it is posted.
create or replace function enforce_watermarked_asset()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approved', 'scheduled', 'posted') and new.asset_id is not null then
    if not exists (select 1 from content_assets a where a.id = new.asset_id and a.is_watermarked) then
      raise exception 'Post % cannot be % with an asset that is not watermarked', new.id, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger content_posts_watermark_rule
  before insert or update on content_posts
  for each row execute function enforce_watermarked_asset();

create trigger content_posts_set_updated_at
  before update on content_posts
  for each row execute function set_updated_at();

create index content_posts_status_idx on content_posts (status, planned_for);
create index content_posts_asset_id_idx on content_posts (asset_id);
create index content_results_post_id_idx on content_results (post_id);

alter table content_assets enable row level security;
alter table content_posts enable row level security;
alter table content_results enable row level security;

create policy staff_all_content_assets on content_assets for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_all_content_posts on content_posts for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_all_content_results on content_results for all to authenticated using (is_staff()) with check (is_staff());

revoke all on content_assets, content_posts, content_results from anon, authenticated;
grant select, insert, update, delete on content_assets, content_posts, content_results to authenticated;

-- ===== 20261014000004_collection_images.sql =====
-- 004: gallery images for a collection, with a caption per image.
-- Used by the /admin page and by the public collection pages.
-- The cover image stays in collections.hero_image_path.

create table collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  image_path text not null,          -- path inside the public-images bucket
  caption text,                      -- item name shown under the image
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint collection_images_caption_length check (coalesce(char_length(caption), 0) <= 120)
);

create index collection_images_collection_id_idx on collection_images (collection_id, sort_order);

alter table collection_images enable row level security;

-- Staff manage everything.
create policy staff_all_collection_images on collection_images
  for all to authenticated using (is_staff()) with check (is_staff());

-- The public website reads the images of published collections only.
create policy public_read_collection_images on collection_images
  for select to anon, authenticated using (
    exists (select 1 from collections c where c.id = collection_images.collection_id and c.is_published)
  );

revoke all on collection_images from anon, authenticated;
grant select on collection_images to anon;
grant select, insert, update, delete on collection_images to authenticated;
