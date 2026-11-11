-- 002: every visitor (not only emailed contacts), with device, IP and country, plus the staff dashboard and link generator.
-- Applied 11 Nov 2026 as migration talastudio_visitor_tracker_002. Guide: docs/visitor-tracking.md
--
-- The website still writes through one public function. The dashboard (/tracker on the site) signs in with a Supabase
-- account of this project, and every dashboard function checks that the account is in talastudio_visitor_tracker.admins.

-- 1. Visits: anyone, not only contacts ------------------------------------------------
drop function public.talastudio_log_page_visit(uuid, uuid, text, text, text, boolean, int);

alter table talastudio_visitor_tracker.page_visits
  alter column contact_id drop not null,
  add column visitor_id uuid,           -- one per browser (local storage): counts unique visitors
  add column ip inet,                   -- from Cloudflare in front of Supabase
  add column country text,              -- 2-letter code from Cloudflare
  add column user_agent text,
  add column referrer text;             -- the outside page they came from, if any

create index page_visits_visitor_idx on talastudio_visitor_tracker.page_visits (visitor_id, started_at desc);
create index page_visits_started_idx on talastudio_visitor_tracker.page_visits (started_at desc);

-- Device from the browser's user agent. Bots first, then tablets (before phones: Android tablets lack "Mobile").
create function talastudio_visitor_tracker.device_of(ua text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when ua is null or ua = '' then 'unknown'
    when ua ~* 'bot|crawl|spider|slurp|headless|lighthouse|preview' then 'bot'
    when ua ~* 'ipad|tablet|kindle|silk' or (ua ~* 'android' and ua !~* 'mobile') then 'tablet'
    when ua ~* 'mobi|iphone|ipod|android|windows phone' then 'mobile'
    else 'desktop'
  end
$$;

create function talastudio_visitor_tracker.browser_of(ua text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when ua ~* 'edg/' then 'Edge'
    when ua ~* 'opr/|opera' then 'Opera'
    when ua ~* 'samsungbrowser' then 'Samsung'
    when ua ~* 'firefox|fxios' then 'Firefox'
    when ua ~* 'chrome|crios' then 'Chrome'
    when ua ~* 'safari' then 'Safari'
    else 'Other'
  end || ' · ' || case
    when ua ~* 'windows' then 'Windows'
    when ua ~* 'iphone|ipad|ipod' then 'iOS'
    when ua ~* 'android' then 'Android'
    when ua ~* 'mac os' then 'macOS'
    when ua ~* 'linux' then 'Linux'
    else 'Other'
  end
$$;

-- Called when a page opens (seconds 0) and each time the tab is hidden or closed (seconds = the running total).
-- A known code links the visit to its contact; anything else is an anonymous visit. A row counts at most 2 hours.
create function public.talastudio_log_page_visit(
  p_id uuid, p_visitor uuid, p_session uuid, p_code text, p_path text, p_collection text,
  p_section boolean, p_seconds int, p_referrer text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_contact uuid;
  v_headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip text := v_headers ->> 'cf-connecting-ip';
begin
  if coalesce(p_code, '') <> '' then
    select id into v_contact from talastudio_visitor_tracker.contacts where track_code = p_code;
  end if;

  insert into talastudio_visitor_tracker.page_visits
    (id, contact_id, visitor_id, session_id, path, collection_slug, is_section, seconds, ip, country, user_agent, referrer)
  values (
    p_id, v_contact, p_visitor, p_session, left(p_path, 300), left(nullif(p_collection, ''), 120), coalesce(p_section, false),
    least(greatest(coalesce(p_seconds, 0), 0), 7200),
    case when v_ip ~ '^[0-9a-fA-F:.]{3,45}$' then v_ip::inet end,
    left(nullif(v_headers ->> 'cf-ipcountry', ''), 2),
    left(v_headers ->> 'user-agent', 400),
    left(nullif(p_referrer, ''), 300)
  )
  on conflict (id) do update
    set seconds = greatest(talastudio_visitor_tracker.page_visits.seconds, excluded.seconds), updated_at = now()
    where talastudio_visitor_tracker.page_visits.session_id = excluded.session_id;
end;
$$;
comment on function public.talastudio_log_page_visit is 'TalaStudio website visit logger. Data in schema talastudio_visitor_tracker.';
revoke all on function public.talastudio_log_page_visit(uuid, uuid, uuid, text, text, text, boolean, int, text) from public;
grant execute on function public.talastudio_log_page_visit(uuid, uuid, uuid, text, text, text, boolean, int, text) to anon, authenticated;

-- 2. Who may open the dashboard --------------------------------------------------------
-- Add someone: insert into talastudio_visitor_tracker.admins (user_id) select id from auth.users where email = '...';
create table talastudio_visitor_tracker.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
alter table talastudio_visitor_tracker.admins enable row level security;

create function talastudio_visitor_tracker.check_admin()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from talastudio_visitor_tracker.admins where user_id = auth.uid()) then
    raise exception 'not a tracker admin' using errcode = '42501';
  end if;
end;
$$;

-- 3. Dashboard data -----------------------------------------------------------------------
-- Everything between p_from and p_to in one call. Bots are left out. A visitor = one browser.
create function talastudio_visitor_tracker.dashboard(p_from timestamptz, p_to timestamptz)
returns json language sql stable security definer set search_path = ''
as $$
  with v as (
    select pv.*, coalesce(pv.visitor_id, pv.session_id) as who, talastudio_visitor_tracker.device_of(pv.user_agent) as device
    from talastudio_visitor_tracker.page_visits pv
    where pv.started_at >= p_from and pv.started_at < p_to
  ), v2 as (select * from v where device <> 'bot'),
  pages as (select * from v2 where not is_section)
  select json_build_object(
    'totals', (select json_build_object(
        'visitors', count(distinct who), 'visits', count(distinct session_id),
        'page_views', count(*) filter (where not is_section),
        'seconds', coalesce(sum(seconds) filter (where not is_section), 0),
        'contacts', count(distinct contact_id), 'countries', count(distinct country)) from v2),
    'by_day', (select coalesce(json_agg(d order by d.day), '[]') from (
        select started_at::date as day, count(distinct who) as visitors, count(*) as page_views
        from pages group by 1) d),
    'visitors', (select coalesce(json_agg(x order by x.last_seen desc), '[]') from (
        select v2.who as visitor_id,
               (array_agg(c.id order by v2.started_at desc) filter (where c.id is not null))[1] as contact_id,
               (array_agg(c.contact_name order by v2.started_at desc) filter (where c.id is not null))[1] as contact_name,
               (array_agg(c.company order by v2.started_at desc) filter (where c.id is not null))[1] as company,
               (array_agg(c.email order by v2.started_at desc) filter (where c.id is not null))[1] as email,
               (array_agg(v2.country order by v2.started_at desc))[1] as country,
               (array_agg(host(v2.ip) order by v2.started_at desc))[1] as ip,
               (array_agg(v2.device order by v2.started_at desc))[1] as device,
               (array_agg(talastudio_visitor_tracker.browser_of(v2.user_agent) order by v2.started_at desc))[1] as browser,
               count(distinct v2.session_id) as visits,
               count(*) filter (where not v2.is_section) as page_views,
               coalesce(sum(v2.seconds) filter (where not v2.is_section), 0) as seconds,
               (array_agg(v2.collection_slug order by v2.seconds desc) filter (where v2.collection_slug is not null))[1] as top_collection,
               min(v2.started_at) as first_seen, max(v2.updated_at) as last_seen
        from v2 left join talastudio_visitor_tracker.contacts c on c.id = v2.contact_id
        group by v2.who order by max(v2.updated_at) desc limit 1000) x),
    'pages', (select coalesce(json_agg(p order by p.views desc), '[]') from (
        select path, count(*) as views, count(distinct who) as visitors, sum(seconds) as seconds
        from pages group by path order by 2 desc limit 50) p),
    'collections', (select coalesce(json_agg(p order by p.seconds desc), '[]') from (
        select collection_slug as slug, count(distinct who) as visitors, sum(seconds) as seconds
        from v2 where collection_slug is not null group by 1) p),
    'countries', (select coalesce(json_agg(p order by p.visitors desc), '[]') from (
        select coalesce(country, '??') as country, count(distinct who) as visitors from v2 group by 1) p),
    'devices', (select coalesce(json_agg(p order by p.visitors desc), '[]') from (
        select device, count(distinct who) as visitors from v2 group by 1) p),
    'referrers', (select coalesce(json_agg(p order by p.visitors desc), '[]') from (
        select coalesce(substring(referrer from '^https?://([^/?#]+)'), 'Direct / email') as source, count(distinct who) as visitors
        from pages group by 1 order by 2 desc limit 20) p)
  )
$$;

-- Every row for one visitor (one browser), newest first.
create function talastudio_visitor_tracker.visitor_detail(p_visitor uuid)
returns json language sql stable security definer set search_path = ''
as $$
  select coalesce(json_agg(r order by r.started_at desc), '[]') from (
    select pv.started_at, pv.updated_at, pv.path, pv.collection_slug, pv.is_section, pv.seconds, pv.session_id,
           pv.country, host(pv.ip) as ip, talastudio_visitor_tracker.device_of(pv.user_agent) as device,
           talastudio_visitor_tracker.browser_of(pv.user_agent) as browser, pv.referrer,
           c.contact_name, c.company, c.email
    from talastudio_visitor_tracker.page_visits pv
    left join talastudio_visitor_tracker.contacts c on c.id = pv.contact_id
    where coalesce(pv.visitor_id, pv.session_id) = p_visitor
    order by pv.started_at desc limit 2000) r
$$;

-- 4. Contacts and links ---------------------------------------------------------------------
create function talastudio_visitor_tracker.contact_list()
returns json language sql stable security definer set search_path = ''
as $$
  select coalesce(json_agg(r order by r.created_at desc), '[]') from (
    select c.id, c.company, c.contact_name, c.email, c.campaign, c.notes, c.track_code, c.created_at,
           count(distinct pv.session_id) as visits,
           coalesce(sum(pv.seconds) filter (where not pv.is_section), 0) as seconds,
           max(pv.updated_at) as last_seen
    from talastudio_visitor_tracker.contacts c
    left join talastudio_visitor_tracker.page_visits pv on pv.contact_id = c.id
    group by c.id) r
$$;

-- p_rows: [{company, contact_name, email, campaign, notes}, ...] (up to 5000).
-- A row whose email is already in the table keeps its code (existing = true) and fills in blanks only.
create function talastudio_visitor_tracker.add_contacts(p_rows jsonb)
returns json language plpgsql volatile security definer set search_path = ''
as $$
declare
  r jsonb;
  v_email text;
  v_row talastudio_visitor_tracker.contacts;
  v_existing boolean;
  v_out jsonb := '[]';
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'send an array of up to 5000 rows';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    v_email := nullif(lower(trim(r ->> 'email')), '');
    v_row := null;
    if v_email is not null then
      select * into v_row from talastudio_visitor_tracker.contacts where lower(email) = v_email;
    end if;
    v_existing := v_row.id is not null;
    if v_existing then
      update talastudio_visitor_tracker.contacts set
        company = coalesce(company, nullif(trim(r ->> 'company'), '')),
        contact_name = coalesce(contact_name, nullif(trim(r ->> 'contact_name'), '')),
        campaign = coalesce(campaign, nullif(trim(r ->> 'campaign'), '')),
        notes = coalesce(notes, nullif(trim(r ->> 'notes'), ''))
      where id = v_row.id returning * into v_row;
    else
      insert into talastudio_visitor_tracker.contacts (company, contact_name, email, campaign, notes)
      values (left(nullif(trim(r ->> 'company'), ''), 200), left(nullif(trim(r ->> 'contact_name'), ''), 200), v_email,
              left(nullif(trim(r ->> 'campaign'), ''), 200), left(nullif(trim(r ->> 'notes'), ''), 2000))
      returning * into v_row;
    end if;
    v_out := v_out || jsonb_build_object(
      'id', v_row.id, 'company', v_row.company, 'contact_name', v_row.contact_name, 'email', v_row.email,
      'campaign', v_row.campaign, 'track_code', v_row.track_code, 'existing', v_existing);
  end loop;
  return v_out;
end;
$$;

create function talastudio_visitor_tracker.delete_contact(p_id uuid)
returns void language sql volatile security definer set search_path = ''
as $$ delete from talastudio_visitor_tracker.contacts where id = p_id $$;

-- Only the public wrappers below are callable; each checks the admin list first.
revoke all on all functions in schema talastudio_visitor_tracker from public, anon, authenticated;

-- 5. Public wrappers for the dashboard (signed-in admins only) ----------------------------
create function public.talastudio_tracker_dashboard(p_from timestamptz, p_to timestamptz)
returns json language plpgsql stable security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.dashboard(p_from, p_to); end; $$;

create function public.talastudio_tracker_visitor(p_visitor uuid)
returns json language plpgsql stable security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.visitor_detail(p_visitor); end; $$;

create function public.talastudio_tracker_contacts()
returns json language plpgsql stable security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.contact_list(); end; $$;

create function public.talastudio_tracker_add_contacts(p_rows jsonb)
returns json language plpgsql volatile security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.add_contacts(p_rows); end; $$;

create function public.talastudio_tracker_delete_contact(p_id uuid)
returns void language plpgsql volatile security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); perform talastudio_visitor_tracker.delete_contact(p_id); end; $$;

revoke all on function public.talastudio_tracker_dashboard(timestamptz, timestamptz), public.talastudio_tracker_visitor(uuid),
  public.talastudio_tracker_contacts(), public.talastudio_tracker_add_contacts(jsonb), public.talastudio_tracker_delete_contact(uuid)
  from public, anon;
grant execute on function public.talastudio_tracker_dashboard(timestamptz, timestamptz), public.talastudio_tracker_visitor(uuid),
  public.talastudio_tracker_contacts(), public.talastudio_tracker_add_contacts(jsonb), public.talastudio_tracker_delete_contact(uuid)
  to authenticated;
