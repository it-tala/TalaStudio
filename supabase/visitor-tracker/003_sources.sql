-- 003: links for posts and channels (a LinkedIn post by Evin, an Instagram story, the WhatsApp status...), not for a person.
-- Applied 11 Nov 2026 as migration talastudio_visitor_tracker_003. Guide: docs/visitor-tracking.md
--
-- A post link is ?s=<code>. The website keeps it for that tab session only, so every page of that visit counts for the
-- post, and a person's own ?r= code (kept in the browser) is never replaced by it.

create table talastudio_visitor_tracker.sources (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 2-letter channel + 6 hex (li3f9a2c): never 12 long like a contact code
  channel text not null check (channel in ('linkedin', 'instagram', 'facebook', 'whatsapp', 'newsletter', 'other')),
  owner text,                         -- who posted it: Evin, David, TalaStudio page...
  title text not null,                -- what it is: "Zuma living launch post"
  post_url text,                      -- the post itself, added once it is live
  target text not null default '#collections',  -- where on the site the link opens
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sources_code_format check (code ~ '^[a-z]{2}[0-9a-f]{6}$'),
  constraint sources_lengths check (char_length(title) <= 200 and coalesce(char_length(owner), 0) <= 100
    and coalesce(char_length(post_url), 0) <= 500 and char_length(target) <= 200)
);
alter table talastudio_visitor_tracker.sources enable row level security;

alter table talastudio_visitor_tracker.page_visits
  add column source_id uuid references talastudio_visitor_tracker.sources (id) on delete set null;
create index page_visits_source_idx on talastudio_visitor_tracker.page_visits (source_id);

-- 1. Logging: the same function with the post code added ---------------------------------
create function public.talastudio_log_page_visit(
  p_id uuid, p_visitor uuid, p_session uuid, p_code text, p_path text, p_collection text,
  p_section boolean, p_seconds int, p_referrer text, p_source text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_contact uuid;
  v_source uuid;
  v_headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip text := v_headers ->> 'cf-connecting-ip';
begin
  if coalesce(p_code, '') <> '' then
    select id into v_contact from talastudio_visitor_tracker.contacts where track_code = p_code;
  end if;
  if coalesce(p_source, '') <> '' then
    select id into v_source from talastudio_visitor_tracker.sources where code = lower(p_source);
  end if;

  insert into talastudio_visitor_tracker.page_visits
    (id, contact_id, source_id, visitor_id, session_id, path, collection_slug, is_section, seconds, ip, country, user_agent, referrer)
  values (
    p_id, v_contact, v_source, p_visitor, p_session, left(p_path, 300), left(nullif(p_collection, ''), 120), coalesce(p_section, false),
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
comment on function public.talastudio_log_page_visit(uuid, uuid, uuid, text, text, text, boolean, int, text, text)
  is 'TalaStudio website visit logger. Data in schema talastudio_visitor_tracker.';
revoke all on function public.talastudio_log_page_visit(uuid, uuid, uuid, text, text, text, boolean, int, text, text) from public;
grant execute on function public.talastudio_log_page_visit(uuid, uuid, uuid, text, text, text, boolean, int, text, text) to anon, authenticated;

-- Pages still open from before this change call the old version: hand them on, without a post.
create or replace function public.talastudio_log_page_visit(
  p_id uuid, p_visitor uuid, p_session uuid, p_code text, p_path text, p_collection text,
  p_section boolean, p_seconds int, p_referrer text
)
returns void language sql security definer set search_path = ''
as $$ select public.talastudio_log_page_visit(p_id, p_visitor, p_session, p_code, p_path, p_collection, p_section, p_seconds, p_referrer, null) $$;

-- 2. Dashboard: sources per period, and on each visitor ------------------------------------
create or replace function talastudio_visitor_tracker.dashboard(p_from timestamptz, p_to timestamptz)
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
               array_remove(array_agg(distinct s.title), null) as sources,
               count(distinct v2.session_id) as visits,
               count(*) filter (where not v2.is_section) as page_views,
               coalesce(sum(v2.seconds) filter (where not v2.is_section), 0) as seconds,
               (array_agg(v2.collection_slug order by v2.seconds desc) filter (where v2.collection_slug is not null))[1] as top_collection,
               min(v2.started_at) as first_seen, max(v2.updated_at) as last_seen
        from v2
        left join talastudio_visitor_tracker.contacts c on c.id = v2.contact_id
        left join talastudio_visitor_tracker.sources s on s.id = v2.source_id
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
        from pages group by 1 order by 2 desc limit 20) p),
    'sources', (select coalesce(json_agg(p order by p.visitors desc), '[]') from (
        select s.id, s.title, s.channel, s.owner, count(distinct v2.who) as visitors, count(distinct v2.session_id) as visits,
               coalesce(sum(v2.seconds) filter (where not v2.is_section), 0) as seconds
        from v2 join talastudio_visitor_tracker.sources s on s.id = v2.source_id group by s.id) p)
  )
$$;

-- 3. Managing post links ----------------------------------------------------------------------
-- Every link with its all-time numbers (bots left out).
create function talastudio_visitor_tracker.source_list()
returns json language sql stable security definer set search_path = ''
as $$
  select coalesce(json_agg(r order by r.created_at desc), '[]') from (
    select s.id, s.code, s.channel, s.owner, s.title, s.post_url, s.target, s.archived, s.created_at,
           count(distinct coalesce(v.visitor_id, v.session_id)) as visitors,
           count(distinct v.session_id) as visits,
           count(v.id) filter (where not v.is_section) as page_views,
           coalesce(sum(v.seconds) filter (where not v.is_section), 0) as seconds,
           count(distinct v.contact_id) as contacts,
           mode() within group (order by v.country) as top_country,
           round(100.0 * count(distinct coalesce(v.visitor_id, v.session_id)) filter (where talastudio_visitor_tracker.device_of(v.user_agent) = 'mobile')
                 / nullif(count(distinct coalesce(v.visitor_id, v.session_id)), 0)) as mobile_pct,
           max(v.updated_at) as last_seen
    from talastudio_visitor_tracker.sources s
    left join talastudio_visitor_tracker.page_visits v
      on v.source_id = s.id and talastudio_visitor_tracker.device_of(v.user_agent) <> 'bot'
    group by s.id) r
$$;

-- p: {channel, owner, title, post_url, target}. Returns the new row.
create function talastudio_visitor_tracker.add_source(p jsonb)
returns json language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_channel text := coalesce(nullif(p ->> 'channel', ''), 'other');
  v_prefix text := case v_channel when 'linkedin' then 'li' when 'instagram' then 'ig' when 'facebook' then 'fb'
                     when 'whatsapp' then 'wa' when 'newsletter' then 'nl' else 'xx' end;
  v_code text;
  v_row talastudio_visitor_tracker.sources;
begin
  if coalesce(trim(p ->> 'title'), '') = '' then raise exception 'give the link a title'; end if;
  loop
    v_code := v_prefix || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    exit when not exists (select 1 from talastudio_visitor_tracker.sources where code = v_code);
  end loop;
  insert into talastudio_visitor_tracker.sources (code, channel, owner, title, post_url, target)
  values (v_code, v_channel, nullif(trim(p ->> 'owner'), ''), trim(p ->> 'title'), nullif(trim(p ->> 'post_url'), ''),
          coalesce(p ->> 'target', '#collections'))
  returning * into v_row;
  return row_to_json(v_row);
end;
$$;

-- p: any of {title, owner, post_url, archived}. The code and where it opens stay, so a shared link keeps working.
create function talastudio_visitor_tracker.update_source(p_id uuid, p jsonb)
returns void language sql volatile security definer set search_path = ''
as $$
  update talastudio_visitor_tracker.sources set
    title = coalesce(nullif(trim(p ->> 'title'), ''), title),
    owner = case when p ? 'owner' then nullif(trim(p ->> 'owner'), '') else owner end,
    post_url = case when p ? 'post_url' then nullif(trim(p ->> 'post_url'), '') else post_url end,
    archived = coalesce((p ->> 'archived')::boolean, archived)
  where id = p_id
$$;

revoke all on all functions in schema talastudio_visitor_tracker from public, anon, authenticated;

create function public.talastudio_tracker_sources()
returns json language plpgsql stable security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.source_list(); end; $$;

create function public.talastudio_tracker_add_source(p jsonb)
returns json language plpgsql volatile security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); return talastudio_visitor_tracker.add_source(p); end; $$;

create function public.talastudio_tracker_update_source(p_id uuid, p jsonb)
returns void language plpgsql volatile security definer set search_path = ''
as $$ begin perform talastudio_visitor_tracker.check_admin(); perform talastudio_visitor_tracker.update_source(p_id, p); end; $$;

revoke all on function public.talastudio_tracker_sources(), public.talastudio_tracker_add_source(jsonb),
  public.talastudio_tracker_update_source(uuid, jsonb) from public, anon;
grant execute on function public.talastudio_tracker_sources(), public.talastudio_tracker_add_source(jsonb),
  public.talastudio_tracker_update_source(uuid, jsonb) to authenticated;
