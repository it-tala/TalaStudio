-- 0002_contacts_events.sql
-- Folds the old talastudio_visitor_tracker schema into schema talastudio (one schema, no second marketing schema).
--   contacts     : moved as-is, plus prospect fields for Azkia's load (country, source_tier, title, phone, linkedin_url)
--   events       : replaces page_visits. One row per event; site heartbeats keep updating the same row.
--   public.talastudio_log_page_visit keeps its name and signature, so the website keeps working.
-- No data is copied: contacts and page_visits were empty in john-lau-v01 on 9 Nov 2026.

create table talastudio.contacts (
  id            uuid primary key default gen_random_uuid(),
  company       text,
  contact_name  text,
  email         text,
  campaign      text,
  notes         text,
  country       text,
  source_tier   text check (source_tier in ('Prospects','Apollo Priority')),
  title         text,
  phone         text,
  linkedin_url  text,
  track_code    text not null unique
                  default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
                  check (track_code ~ '^[a-z0-9]{6,32}$'),
  link          text generated always as (('https://talastudio.net/?r=' || track_code) || '#collections') stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index contacts_email_key on talastudio.contacts (lower(email)) where email is not null;
create trigger contacts_touch before update on talastudio.contacts
  for each row execute function talastudio.touch_updated_at();

create table talastudio.events (
  id          uuid primary key default gen_random_uuid(),   -- the website sends its own id and re-sends it as seconds grow
  contact_id  uuid references talastudio.contacts(id) on delete cascade,
  track_code  text,
  event_type  text not null check (event_type in ('page_visit','link_click','email_reply','login_request')),
  path        text check (path is null or char_length(path) <= 300),
  ref         text,
  ts          timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb         -- page_visit: session_id, collection_slug, is_section, seconds
);
create index events_contact_ts_idx on talastudio.events (contact_id, ts desc);
create index events_type_ts_idx    on talastudio.events (event_type, ts desc);
create index events_track_code_idx on talastudio.events (track_code);

-- ---------- public visit logger (anonymous, same name and signature as before) ----------
create or replace function public.talastudio_log_page_visit(
  p_id uuid, p_session uuid, p_code text, p_path text,
  p_collection text, p_section boolean, p_seconds integer)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_contact uuid;
  v_sec integer := least(greatest(coalesce(p_seconds, 0), 0), 7200);
begin
  select id into v_contact from talastudio.contacts where track_code = p_code;
  if v_contact is null then return; end if;

  insert into talastudio.events as e (id, contact_id, track_code, event_type, path, meta)
  values (p_id, v_contact, p_code, 'page_visit', left(p_path, 300),
          jsonb_build_object('session_id', p_session,
                             'collection_slug', left(nullif(p_collection, ''), 120),
                             'is_section', coalesce(p_section, false),
                             'seconds', v_sec))
  on conflict (id) do update
    set meta = jsonb_set(e.meta, '{seconds}',
                 to_jsonb(greatest(coalesce((e.meta->>'seconds')::integer, 0), v_sec))),
        updated_at = now()
    where e.contact_id = excluded.contact_id and e.event_type = 'page_visit';
end;
$function$;

revoke all on function public.talastudio_log_page_visit(uuid,uuid,text,text,text,boolean,integer) from public;
grant execute on function public.talastudio_log_page_visit(uuid,uuid,text,text,text,boolean,integer) to anon, authenticated;

-- ---------- views (same columns as the old engagement / collection_time views) ----------
create view talastudio.engagement with (security_invoker = true) as
select c.id as contact_id, c.company, c.contact_name, c.email, c.campaign,
       count(distinct e.meta->>'session_id')                                              as visits,
       count(*) filter (where not (e.meta->>'is_section')::boolean)                       as page_views,
       sum((e.meta->>'seconds')::integer) filter (where not (e.meta->>'is_section')::boolean) as total_seconds,
       min(e.ts)         as first_seen,
       max(e.updated_at) as last_seen
from talastudio.contacts c
join talastudio.events e on e.contact_id = c.id and e.event_type = 'page_visit'
group by c.id;

create view talastudio.collection_time with (security_invoker = true) as
select c.id as contact_id, c.company, c.contact_name,
       e.meta->>'collection_slug'                 as collection_slug,
       count(*)                                   as views,
       sum((e.meta->>'seconds')::integer)         as total_seconds,
       max(e.updated_at)                          as last_seen
from talastudio.events e
join talastudio.contacts c on c.id = e.contact_id
where e.event_type = 'page_visit' and e.meta->>'collection_slug' is not null
group by c.id, e.meta->>'collection_slug';

-- last event per contact (for the "Act today" view); contacts with no event show up with null event fields
create view talastudio.contact_last_event with (security_invoker = true) as
select distinct on (c.id)
       c.id as contact_id, c.company, c.contact_name, c.email, c.track_code,
       e.event_type, e.path, e.updated_at as last_event_at, e.meta
from talastudio.contacts c
left join talastudio.events e on e.contact_id = c.id
order by c.id, e.updated_at desc nulls last;

-- ---------- RLS: team allowlist only ----------
alter table talastudio.contacts enable row level security;
alter table talastudio.events   enable row level security;

grant select, insert, update on talastudio.contacts, talastudio.events to authenticated;
grant select on talastudio.engagement, talastudio.collection_time, talastudio.contact_last_event to authenticated;

create policy team_read   on talastudio.contacts for select to authenticated using (talastudio.is_team());
create policy team_insert on talastudio.contacts for insert to authenticated with check (talastudio.is_team());
create policy team_update on talastudio.contacts for update to authenticated
  using (talastudio.is_team()) with check (talastudio.is_team());
create policy team_read   on talastudio.events   for select to authenticated using (talastudio.is_team());
create policy team_insert on talastudio.events   for insert to authenticated with check (talastudio.is_team());
create policy team_update on talastudio.events   for update to authenticated
  using (talastudio.is_team()) with check (talastudio.is_team());
