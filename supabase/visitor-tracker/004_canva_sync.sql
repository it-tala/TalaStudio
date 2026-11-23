-- 004: holds the Canva refresh token for the catalog PDF sync (scripts/sync-catalog.mjs, .github/workflows/catalog-sync.yml).
-- Applied 23 Nov 2026 as migration talastudio_visitor_tracker_004. Guide: docs/catalog-sync.md
--
-- Canva refresh tokens are single use: every refresh returns a new one and kills the old one, so the token has to be
-- written back after each run. GitHub secrets cannot be rewritten by a workflow, so it lives here, one row.
-- The two functions need a passphrase (CANVA_SYNC_KEY). Only its SHA-256 is stored, set once by hand:
--   update talastudio_visitor_tracker.canva_sync set key_hash = encode(sha256(convert_to('<passphrase>', 'utf8')), 'hex');

create table talastudio_visitor_tracker.canva_sync (
  id int primary key default 1 check (id = 1),   -- one row only
  key_hash text,
  refresh_token text,
  updated_at timestamptz not null default now()
);
alter table talastudio_visitor_tracker.canva_sync enable row level security;   -- no policy: nothing reads it directly
insert into talastudio_visitor_tracker.canva_sync (id) values (1);

create function public.talastudio_canva_token_get(p_key text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v talastudio_visitor_tracker.canva_sync;
begin
  select * into v from talastudio_visitor_tracker.canva_sync where id = 1;
  if v.key_hash is null or p_key is null
     or encode(sha256(convert_to(p_key, 'utf8')), 'hex') <> v.key_hash then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v.refresh_token;
end;
$$;

create function public.talastudio_canva_token_set(p_key text, p_token text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v talastudio_visitor_tracker.canva_sync;
begin
  select * into v from talastudio_visitor_tracker.canva_sync where id = 1;
  if v.key_hash is null or p_key is null
     or encode(sha256(convert_to(p_key, 'utf8')), 'hex') <> v.key_hash then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 4000 then
    raise exception 'bad token' using errcode = '22023';
  end if;
  update talastudio_visitor_tracker.canva_sync set refresh_token = p_token, updated_at = now() where id = 1;
end;
$$;

revoke all on function public.talastudio_canva_token_get(text) from public;
revoke all on function public.talastudio_canva_token_set(text, text) from public;
grant execute on function public.talastudio_canva_token_get(text) to anon, authenticated;
grant execute on function public.talastudio_canva_token_set(text, text) to anon, authenticated;
