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
