-- 0003_render_stack_and_messages.sql
-- Render stack (minimal: every render run leaves a row), email threads/messages for the communications
-- dashboard, and the private bucket render-work. RLS on every table, team allowlist only, nothing anonymous.

-- ---------- render stack ----------
create table talastudio.render_jobs (
  id            uuid primary key default gen_random_uuid(),
  product_code  text references talastudio.products(code) on update cascade,
  preset        text,                       -- rig / finish / angle, e.g. casegoods/pacific-sand/front
  model_path    text,
  requested_by  text default (auth.jwt() ->> 'email'),
  status        text not null default 'queued' check (status in ('queued','running','done','failed')),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  error         text
);
create index render_jobs_product_idx on talastudio.render_jobs (product_code, created_at desc);

create table talastudio.render_runs (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid references talastudio.render_jobs(id) on delete set null,
  product_code     text references talastudio.products(code) on update cascade,
  iteration        integer not null default 1,
  blender_preset   jsonb,
  exposure         numeric,
  white_balance    numeric,                 -- kelvin
  prompt_text      text,
  anchor_asset_id  uuid references talastudio.assets(id) on delete set null,
  output_asset_id  uuid references talastudio.assets(id) on delete set null,
  verdict          text check (verdict in ('approved','revise')),
  tags             text[] not null default '{}',
  notes            text,
  logged_by        text default (auth.jwt() ->> 'email'),
  created_at       timestamptz not null default now()
);
create index render_runs_product_idx on talastudio.render_runs (product_code, created_at desc);

create table talastudio.render_feedback (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references talastudio.render_runs(id) on delete cascade,
  source           text check (source in ('canva','chat')),
  category         text check (category in ('tone','exposure','profile','shadow','geometry')),
  instruction      text not null,
  fixed_in_run_id  uuid references talastudio.render_runs(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index render_feedback_run_idx on talastudio.render_feedback (run_id);

create table talastudio.lighting_tweaks (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid references talastudio.render_runs(id) on delete set null,
  product_code        text references talastudio.products(code) on update cascade,
  finish              text,
  angle               text,
  change_text         text not null,
  thumbnail_asset_id  uuid references talastudio.assets(id) on delete set null,
  created_at          timestamptz not null default now()
);

create table talastudio.collection_looks (
  collection_slug         text primary key,
  key_light_k             integer,
  exposure_target         numeric,
  backdrop                text,
  anchor_asset_id         uuid references talastudio.assets(id) on delete set null,
  prompt_template_version text,
  updated_at              timestamptz not null default now()
);
create trigger collection_looks_touch before update on talastudio.collection_looks
  for each row execute function talastudio.touch_updated_at();

-- ---------- email threads and messages (inbound capture, "Act today" dashboard) ----------
create table talastudio.threads (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid references talastudio.contacts(id) on delete cascade,
  title             text,
  summary           text,
  next_action       text,
  next_action_due   date,
  status            text not null default 'open' check (status in ('open','waiting_us','waiting_them','closed')),
  last_activity_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index threads_contact_idx on talastudio.threads (contact_id);
create trigger threads_touch before update on talastudio.threads
  for each row execute function talastudio.touch_updated_at();

create table talastudio.messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid references talastudio.threads(id) on delete cascade,
  contact_id    uuid references talastudio.contacts(id) on delete set null,
  track_code    text,
  channel       text not null default 'email' check (channel in ('email','whatsapp','instagram','linkedin')),
  direction     text not null check (direction in ('inbound','outbound')),
  external_id   text,                        -- gmail message id etc.
  subject       text,
  body          text,
  attachments   jsonb,
  sent_at       timestamptz,
  captured_via  text,                        -- gmail_push, apps_script, forwarded ...
  classification text,                       -- reply, bounce, ooo, unsubscribe, question, order_intent
  needs_reply   boolean not null default false,
  draft_reply   text,                        -- suggestion only, never auto-sent
  created_at    timestamptz not null default now()
);
create unique index messages_channel_external_idx on talastudio.messages (channel, external_id) where external_id is not null;
create index messages_contact_idx on talastudio.messages (contact_id, sent_at desc);
create index messages_thread_idx  on talastudio.messages (thread_id);

-- ---------- RLS: team allowlist only ----------
do $do$
declare t text;
begin
  foreach t in array array['render_jobs','render_runs','render_feedback','lighting_tweaks','collection_looks','threads','messages']
  loop
    execute format('alter table talastudio.%I enable row level security', t);
    execute format('grant select, insert, update on talastudio.%I to authenticated', t);
    execute format('create policy team_read   on talastudio.%I for select to authenticated using (talastudio.is_team())', t);
    execute format('create policy team_insert on talastudio.%I for insert to authenticated with check (talastudio.is_team())', t);
    execute format('create policy team_update on talastudio.%I for update to authenticated using (talastudio.is_team()) with check (talastudio.is_team())', t);
  end loop;
end $do$;

-- ---------- logging RPCs for the render workstation (team login, no service key needed) ----------
create or replace function public.ts_log_render_run(
  p_product_code text, p_iteration integer default 1, p_blender_preset jsonb default null,
  p_exposure numeric default null, p_white_balance numeric default null, p_prompt_text text default null,
  p_anchor_asset_id uuid default null, p_output_asset_id uuid default null, p_verdict text default null,
  p_tags text[] default '{}', p_notes text default null, p_job_id uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid;
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  insert into talastudio.render_runs (job_id, product_code, iteration, blender_preset, exposure, white_balance,
      prompt_text, anchor_asset_id, output_asset_id, verdict, tags, notes)
  values (p_job_id, upper(btrim(p_product_code)), coalesce(p_iteration, 1), p_blender_preset, p_exposure, p_white_balance,
      p_prompt_text, p_anchor_asset_id, p_output_asset_id, p_verdict, coalesce(p_tags, '{}'), p_notes)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $function$;

create or replace function public.ts_log_lighting_tweak(
  p_product_code text, p_change_text text, p_finish text default null, p_angle text default null,
  p_run_id uuid default null, p_thumbnail_asset_id uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid;
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  insert into talastudio.lighting_tweaks (run_id, product_code, finish, angle, change_text, thumbnail_asset_id)
  values (p_run_id, upper(btrim(p_product_code)), p_finish, p_angle, p_change_text, p_thumbnail_asset_id)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $function$;

revoke all on function public.ts_log_render_run(text,integer,jsonb,numeric,numeric,text,uuid,uuid,text,text[],text,uuid) from public, anon;
revoke all on function public.ts_log_lighting_tweak(text,text,text,text,uuid,uuid) from public, anon;
grant execute on function public.ts_log_render_run(text,integer,jsonb,numeric,numeric,text,uuid,uuid,text,text[],text,uuid) to authenticated;
grant execute on function public.ts_log_lighting_tweak(text,text,text,text,uuid,uuid) to authenticated;

-- ---------- storage: render-work (brackets, contact sheets; finals still go to talastudio-masters) ----------
-- 50 MB is the Free-plan ceiling. Raise it (and the project upload limit) after the upgrade to Pro if .blend
-- files are to be stored; until then .blend files stay on the render server and are indexed only.
insert into storage.buckets (id, name, public, file_size_limit)
values ('render-work', 'render-work', false, 52428800)
on conflict (id) do nothing;

create policy "render-work: team read"   on storage.objects for select to authenticated
  using (bucket_id = 'render-work' and talastudio.is_team());
create policy "render-work: team insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'render-work' and talastudio.is_team());
create policy "render-work: team update" on storage.objects for update to authenticated
  using (bucket_id = 'render-work' and talastudio.is_team())
  with check (bucket_id = 'render-work' and talastudio.is_team());
