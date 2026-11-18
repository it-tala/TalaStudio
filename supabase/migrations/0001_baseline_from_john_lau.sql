-- 0001_baseline_from_john_lau.sql
-- Baseline of the TalaStudio objects that lived in the shared project john-lau-v01
-- (migrations talastudio_catalog_and_assets + talastudio_team_allowlist), rebuilt for talastudio-prod.
-- Function bodies are copied from the live source database. Differences from the source:
--   * team_members.role is constrained to admin / editor / approver
--   * assets: only admin / approver may change approval fields (can_approve), via column grants
--   * helper functions are executable by authenticated users only (anon revoked explicitly)
-- The visitor tracker (contacts, events) is created already folded into this schema in 0002.

create schema if not exists talastudio;
grant usage on schema talastudio to authenticated;

create type talastudio.asset_view_t as enum
  ('front','perspective','detail','spec','finish','room_hero','lp_hero','social','process','other');

-- ---------- tables ----------
create table talastudio.team_members (
  email       text primary key check (email = lower(email)),
  name        text,
  role        text check (role in ('admin','editor','approver')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table talastudio.products (
  code             text primary key check (code ~ '^[A-Z]{2}-[0-9]{3}$'),
  tracker_code     text,
  collection       text not null,
  collection_slug  text not null,
  room             text not null check (room in ('bedroom','living','dining')),
  item_type        text,
  name             text not null,
  w_mm             integer,
  d_mm             integer,
  h_mm             integer,
  finishes         text[] not null default '{}',
  blend_file       text,
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_collection_slug_idx on talastudio.products (collection_slug);

create table talastudio.assets (
  id                  uuid primary key default gen_random_uuid(),
  product_code        text references talastudio.products(code) on update cascade on delete set null,
  collection_slug     text not null,
  view                talastudio.asset_view_t not null,
  finish              text,
  seq                 integer not null default 1 check (seq >= 1 and seq <= 99),
  storage_path        text not null unique,
  status              text not null default 'reserved'
                        check (status in ('reserved','inbox','approved','rejected','archived')),
  mime                text,
  bytes               bigint,
  width               integer,
  height              integer,
  sha256              text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  source_url          text,
  source_page         text,
  notes               text,
  approved_for_web    boolean not null default false,
  approved_for_social boolean not null default false,
  uploaded_by         uuid default auth.uid(),
  uploaded_email      text default (auth.jwt() ->> 'email'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index assets_product_code_view_idx     on talastudio.assets (product_code, view);
create index assets_collection_slug_view_idx  on talastudio.assets (collection_slug, view);
create index assets_sha256_idx                on talastudio.assets (sha256);
create index assets_status_created_at_idx     on talastudio.assets (status, created_at desc);

-- ---------- helper functions (copied from the source database) ----------
create or replace function talastudio.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.updated_at := now(); return new; end $function$;

create or replace function talastudio.is_team()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(auth.jwt()->>'email','') <> '' and exists (
    select 1 from talastudio.team_members m
    where m.active and m.email = lower(auth.jwt()->>'email'));
$function$;

create or replace function talastudio.can_upload(p_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select talastudio.is_team() and exists (
    select 1 from talastudio.assets a
    where a.storage_path = p_path and a.status = 'reserved'
      and a.uploaded_by = auth.uid()
      and a.created_at > now() - interval '2 hours');
$function$;

create or replace function talastudio.can_approve()
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(auth.jwt()->>'email','') <> '' and exists (
    select 1 from talastudio.team_members m
    where m.active and m.email = lower(auth.jwt()->>'email')
      and m.role in ('admin','approver'));
$function$;

create trigger products_touch before update on talastudio.products
  for each row execute function talastudio.touch_updated_at();
create trigger assets_touch before update on talastudio.assets
  for each row execute function talastudio.touch_updated_at();

-- ---------- RPCs used by the Save to TalaStudio extension (copied from the source database) ----------
create or replace function public.ts_catalog()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  return jsonb_build_object(
    'products', coalesce((select jsonb_agg(jsonb_build_object(
        'code', p.code, 'name', p.name, 'collection', p.collection,
        'collection_slug', p.collection_slug, 'room', p.room, 'finishes', p.finishes)
        order by p.collection_slug, p.code) from talastudio.products p), '[]'::jsonb),
    'collections', coalesce((select jsonb_agg(distinct jsonb_build_object(
        'slug', p.collection_slug, 'name', p.collection, 'room', p.room))
        from talastudio.products p), '[]'::jsonb),
    'views', to_jsonb(enum_range(null::talastudio.asset_view_t)::text[]),
    'me', auth.jwt()->>'email');
end $function$;

create or replace function public.ts_reserve_asset(p_product_code text, p_collection_slug text, p_view text, p_finish text, p_ext text, p_sha256 text, p_source_url text DEFAULT NULL::text, p_source_page text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_prod talastudio.products;
  v_slug text; v_view talastudio.asset_view_t; v_ext text; v_finish text;
  v_seq int; v_key text; v_path text; v_id uuid; v_dup uuid;
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;

  v_view := p_view::talastudio.asset_view_t;
  v_ext := lower(coalesce(p_ext,''));
  if v_ext = 'jpeg' then v_ext := 'jpg'; end if;
  if v_ext not in ('jpg','png','webp','tif','tiff','avif') then raise exception 'unsupported file type %', p_ext; end if;
  v_finish := nullif(btrim(p_finish), '');

  if nullif(p_product_code,'') is not null then
    select * into v_prod from talastudio.products where code = upper(btrim(p_product_code));
    if not found then raise exception 'unknown product code %', p_product_code; end if;
    v_slug := v_prod.collection_slug;
    v_key := v_prod.code;
  else
    v_slug := lower(btrim(coalesce(p_collection_slug,'')));
    if not exists (select 1 from talastudio.products where collection_slug = v_slug) then
      raise exception 'unknown collection %', p_collection_slug; end if;
    v_key := v_slug;
  end if;

  -- same file already saved for the same item and view -> report, don't duplicate
  if p_sha256 is not null then
    select id into v_dup from talastudio.assets
    where sha256 = lower(p_sha256) and status <> 'rejected'
      and coalesce(product_code,'') = coalesce(v_prod.code,'') and collection_slug = v_slug
      and view = v_view and coalesce(finish,'') = coalesce(v_finish,'')
      and status <> 'reserved'
    limit 1;
    if v_dup is not null then
      return jsonb_build_object('duplicate_of', v_dup,
        'path', (select storage_path from talastudio.assets where id = v_dup));
    end if;
  end if;

  select coalesce(max(seq),0) + 1 into v_seq from talastudio.assets
  where coalesce(product_code,'') = coalesce(v_prod.code,'') and collection_slug = v_slug
    and view = v_view and coalesce(finish,'') = coalesce(v_finish,'');

  v_path := v_slug || '/' || case when v_prod.code is null then '_collection' else v_prod.code end || '/'
    || v_key || '_' || v_view::text
    || coalesce('_' || trim(both '-' from regexp_replace(lower(v_finish), '[^a-z0-9]+', '-', 'g')), '')
    || '_' || lpad(v_seq::text, 2, '0') || '.' || v_ext;

  insert into talastudio.assets (product_code, collection_slug, view, finish, seq, storage_path,
     sha256, source_url, source_page, notes)
  values (v_prod.code, v_slug, v_view, v_finish, v_seq, v_path,
     lower(p_sha256), left(p_source_url, 2000), left(p_source_page, 2000), left(p_notes, 2000))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'path', v_path, 'bucket', 'talastudio-masters');
end $function$;

create or replace function public.ts_confirm_asset(p_id uuid, p_mime text, p_bytes bigint, p_width integer, p_height integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v talastudio.assets;
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into v from talastudio.assets where id = p_id and uploaded_by = auth.uid() and status = 'reserved';
  if not found then raise exception 'no reserved asset %', p_id; end if;
  if not exists (select 1 from storage.objects o
                 where o.bucket_id = 'talastudio-masters' and o.name = v.storage_path) then
    raise exception 'file not uploaded yet';
  end if;
  update talastudio.assets set status = 'inbox', mime = p_mime, bytes = p_bytes,
         width = p_width, height = p_height
  where id = p_id;
  return jsonb_build_object('id', p_id, 'path', v.storage_path, 'status', 'inbox');
end $function$;

create or replace function public.ts_recent_assets(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x) from (
    select a.id, a.product_code, a.collection_slug, a.view, a.finish, a.storage_path, a.status,
           a.width, a.height, a.uploaded_email, a.created_at
    from talastudio.assets a where a.status <> 'reserved'
    order by a.created_at desc limit least(greatest(p_limit,1),100)) x), '[]'::jsonb);
end $function$;

-- ---------- function privileges: team only, anon revoked ----------
revoke all on function talastudio.touch_updated_at() from public, anon, authenticated;
revoke all on function talastudio.is_team()          from public, anon;
revoke all on function talastudio.can_upload(text)   from public, anon;
revoke all on function talastudio.can_approve()      from public, anon;
revoke all on function public.ts_catalog()           from public, anon;
revoke all on function public.ts_reserve_asset(text,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.ts_confirm_asset(uuid,text,bigint,integer,integer)             from public, anon;
revoke all on function public.ts_recent_assets(integer)                                      from public, anon;
grant execute on function talastudio.is_team()          to authenticated;
grant execute on function talastudio.can_upload(text)   to authenticated;
grant execute on function talastudio.can_approve()      to authenticated;
grant execute on function public.ts_catalog()           to authenticated;
grant execute on function public.ts_reserve_asset(text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.ts_confirm_asset(uuid,text,bigint,integer,integer)             to authenticated;
grant execute on function public.ts_recent_assets(integer)                                      to authenticated;

-- ---------- RLS: team allowlist only, nothing anonymous ----------
alter table talastudio.team_members enable row level security;
alter table talastudio.products     enable row level security;
alter table talastudio.assets       enable row level security;

grant select on talastudio.team_members, talastudio.products, talastudio.assets to authenticated;
grant update (status, approved_for_web, approved_for_social, notes) on talastudio.assets to authenticated;

create policy team_read on talastudio.team_members for select to authenticated using (talastudio.is_team());
create policy team_read on talastudio.products     for select to authenticated using (talastudio.is_team());
create policy team_read on talastudio.assets       for select to authenticated using (talastudio.is_team());
create policy approvers_update on talastudio.assets for update to authenticated
  using (talastudio.can_approve()) with check (talastudio.can_approve());

-- ---------- storage: private bucket for masters ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talastudio-masters', 'talastudio-masters', false, 52428800,
        array['image/jpeg','image/png','image/webp','image/tiff','image/avif'])
on conflict (id) do nothing;

create policy "talastudio masters: team read" on storage.objects for select to authenticated
  using (bucket_id = 'talastudio-masters' and talastudio.is_team());
create policy "talastudio masters: reserved upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'talastudio-masters' and talastudio.can_upload(name));
