-- TalaStudio visitor tracker: which emailed contacts visited the site, and what they looked at.
-- Lives in its own schema in the Talastudio Supabase project (sobinutyzhldustwwmmw), apart from everything else there.
-- Applied 11 Nov 2026 as migration talastudio_visitor_tracker_001, then 002_dashboard.sql. Guide: docs/visitor-tracking.md
--
-- The website never touches this schema directly. Its only way in is public.talastudio_log_page_visit(),
-- which writes visits and returns nothing. Contacts and reports are read in the Supabase dashboard.

create schema talastudio_visitor_tracker;
comment on schema talastudio_visitor_tracker is 'TalaStudio website: which emailed contacts visited and what they looked at.';
revoke all on schema talastudio_visitor_tracker from public, anon, authenticated;

-- 1. Contacts: one per person we email. track_code and link fill themselves. ----------
create table talastudio_visitor_tracker.contacts (
  id uuid primary key default gen_random_uuid(),
  company text,
  contact_name text,
  email text,
  campaign text,                      -- optional: which mailing they came from
  notes text,
  -- 12 hex characters: hard to guess, short enough for a link. Can be given on import instead.
  track_code text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  link text generated always as ('https://talastudio.net/?r=' || track_code || '#collections') stored,
  created_at timestamptz not null default now(),
  constraint contacts_code_format check (track_code ~ '^[a-z0-9]{6,32}$')
);
create unique index contacts_email_key on talastudio_visitor_tracker.contacts (lower(email)) where email is not null;

-- 2. Page visits ---------------------------------------------------------------------
-- Two kinds of row: a page view, and (is_section) the time a collection room on the home page was on screen.
create table talastudio_visitor_tracker.page_visits (
  id uuid primary key,                -- made by the browser, one per page view or section
  contact_id uuid not null references talastudio_visitor_tracker.contacts (id) on delete cascade,
  session_id uuid not null,           -- one per browser tab session: counts return visits
  path text not null,
  collection_slug text,               -- the collection room: a /collections/<slug> page or a home page section
  is_section boolean not null default false,
  seconds int not null default 0,     -- active time: the tab was visible
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_visits_lengths check (char_length(path) <= 300 and coalesce(char_length(collection_slug), 0) <= 120)
);
create index page_visits_contact_id_idx on talastudio_visitor_tracker.page_visits (contact_id, started_at desc);
create index page_visits_collection_idx on talastudio_visitor_tracker.page_visits (collection_slug);

-- No policies: only the dashboard (postgres, service role) can read or change these tables.
alter table talastudio_visitor_tracker.contacts enable row level security;
alter table talastudio_visitor_tracker.page_visits enable row level security;

-- 3. The website's only way in --------------------------------------------------------
-- Called when a page opens (seconds 0) and each time the tab is hidden or closed
-- (seconds = the running total). Unknown codes are ignored. A row counts at most 2 hours.
create function public.talastudio_log_page_visit(
  p_id uuid, p_session uuid, p_code text, p_path text, p_collection text, p_section boolean, p_seconds int
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_contact uuid;
begin
  select id into v_contact from talastudio_visitor_tracker.contacts where track_code = p_code;
  if v_contact is null then return; end if;

  insert into talastudio_visitor_tracker.page_visits (id, contact_id, session_id, path, collection_slug, is_section, seconds)
  values (p_id, v_contact, p_session, left(p_path, 300), left(nullif(p_collection, ''), 120), coalesce(p_section, false),
          least(greatest(coalesce(p_seconds, 0), 0), 7200))
  on conflict (id) do update
    set seconds = greatest(talastudio_visitor_tracker.page_visits.seconds, excluded.seconds), updated_at = now()
    where talastudio_visitor_tracker.page_visits.contact_id = excluded.contact_id;
end;
$$;
comment on function public.talastudio_log_page_visit is 'TalaStudio website visit logger. Data in schema talastudio_visitor_tracker.';

revoke all on function public.talastudio_log_page_visit(uuid, uuid, text, text, text, boolean, int) from public;
grant execute on function public.talastudio_log_page_visit(uuid, uuid, text, text, text, boolean, int) to anon, authenticated;

-- 4. Reports ---------------------------------------------------------------------------
-- One row per contact who visited: most engaged first.
create view talastudio_visitor_tracker.engagement with (security_invoker = true) as
select
  c.id as contact_id, c.company, c.contact_name, c.email, c.campaign,
  count(distinct v.session_id) as visits,
  count(*) filter (where not v.is_section) as page_views,
  sum(v.seconds) filter (where not v.is_section) as total_seconds,
  min(v.started_at) as first_seen,
  max(v.updated_at) as last_seen
from talastudio_visitor_tracker.contacts c
join talastudio_visitor_tracker.page_visits v on v.contact_id = c.id
group by c.id
order by total_seconds desc;

-- Time per contact per collection room (views = page views in which it was seen).
create view talastudio_visitor_tracker.collection_time with (security_invoker = true) as
select
  c.id as contact_id, c.company, c.contact_name, v.collection_slug,
  count(*) as views,
  sum(v.seconds) as total_seconds,
  max(v.updated_at) as last_seen
from talastudio_visitor_tracker.page_visits v
join talastudio_visitor_tracker.contacts c on c.id = v.contact_id
where v.collection_slug is not null
group by c.id, v.collection_slug
order by c.company, total_seconds desc;
