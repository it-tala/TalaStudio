-- TalaStudio outreach: the unsubscribe link in the emails sent from David's mailbox.
-- Applied 24 Nov 2026 as migration talastudio_visitor_tracker_006. Guide: docs/unsubscribe.md
-- (004 and 005 are applied in the project but their files are not on main.)
--
-- Page: https://talastudio.net/unsubscribe/?e=<email, base64url>&k=<signature>  (src/pages/unsubscribe.astro)
-- The link is made by the Apps Script in the DC buyers sheet (Unsubscribe.gs). The signature is the first 20 hex
-- characters of HMAC-SHA256(lower-case email, key), so only a link we sent can unsubscribe an address, and nothing
-- has to be registered here before an email goes out. The key is in outreach_settings and on the sheet's Email Setup tab.
-- Opt-outs are rows in public.outreach_optouts (made 20 Nov 2026 with the "unsubscribe" Edge Function, which still works).

create table talastudio_visitor_tracker.outreach_settings (
  id int primary key default 1 check (id = 1),
  unsubscribe_key text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  updated_at timestamptz not null default now()
);
alter table talastudio_visitor_tracker.outreach_settings enable row level security;
insert into talastudio_visitor_tracker.outreach_settings (id) values (1);

-- The signature for one address. Not callable from the website.
create function talastudio_visitor_tracker.unsubscribe_sig(p_email text)
returns text
language sql stable security definer set search_path = ''
as $$
  select left(encode(extensions.hmac(lower(btrim(p_email)), s.unsubscribe_key, 'sha256'), 'hex'), 20)
  from talastudio_visitor_tracker.outreach_settings s where s.id = 1;
$$;
revoke all on function talastudio_visitor_tracker.unsubscribe_sig(text) from public, anon, authenticated;

-- Called by the unsubscribe page when the visitor presses the button, and again if they give a reason.
-- A wrong signature changes nothing. Returns {ok, already, email}.
create function public.talastudio_unsubscribe(p_email text, p_key text, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_sig text;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
  v_headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  r public.outreach_optouts%rowtype;
  v_already boolean;
begin
  if char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[a-z]{2,}$' or coalesce(p_key, '') = '' then
    return jsonb_build_object('ok', false);
  end if;
  v_sig := talastudio_visitor_tracker.unsubscribe_sig(v_email);
  if v_sig is null or lower(p_key) <> v_sig then
    return jsonb_build_object('ok', false);
  end if;

  select * into r from public.outreach_optouts
   where lower(email) = v_email
   order by (opted_out_at is not null) desc, created_at
   limit 1;

  if not found then
    insert into public.outreach_optouts (token, email, contact_name, company, campaign)
    values (
      v_sig, v_email,
      (select c.contact_name from talastudio_visitor_tracker.contacts c where lower(c.email) = v_email limit 1),
      (select c.company from talastudio_visitor_tracker.contacts c where lower(c.email) = v_email limit 1),
      (select c.campaign from talastudio_visitor_tracker.contacts c where lower(c.email) = v_email limit 1)
    )
    returning * into r;
  end if;

  v_already := r.opted_out_at is not null;

  update public.outreach_optouts
     set opted_out_at = coalesce(opted_out_at, now()),
         method       = coalesce(method, 'footer'),
         reason       = coalesce(v_reason, reason),
         user_agent   = coalesce(user_agent, left(v_headers ->> 'user-agent', 300))
   where id = r.id;

  return jsonb_build_object('ok', true, 'already', v_already, 'email', v_email);
end;
$$;
comment on function public.talastudio_unsubscribe is 'TalaStudio outreach: records an opt-out from the unsubscribe page. Data in public.outreach_optouts.';

-- Called every hour by the Apps Script with the signatures of the people on the Email Tracker tab.
-- Returns the ones who have unsubscribed, so the script can set their Status to "Not interested".
-- A signature cannot be guessed, so this tells an outsider nothing.
create function public.talastudio_unsubscribed(p_keys text[])
returns table (k text, opted_out_at timestamptz, reason text)
language sql stable security definer set search_path = ''
as $$
  select o.sig, o.opted_out_at, o.reason
  from (
    select talastudio_visitor_tracker.unsubscribe_sig(x.email) as sig, x.opted_out_at, x.reason
    from public.outreach_optouts x
    where x.opted_out_at is not null and x.email is not null
  ) o
  where o.sig in (select lower(u) from unnest(p_keys[1:5000]) as u);
$$;
comment on function public.talastudio_unsubscribed is 'TalaStudio outreach: which of these link signatures have unsubscribed. Read by the Apps Script in the DC buyers sheet.';

revoke all on function public.talastudio_unsubscribe(text, text, text) from public;
revoke all on function public.talastudio_unsubscribed(text[]) from public;
grant execute on function public.talastudio_unsubscribe(text, text, text) to anon, authenticated, service_role;
grant execute on function public.talastudio_unsubscribed(text[]) to anon, authenticated, service_role;
