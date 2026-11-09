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
