-- 0004_review_rpcs.sql
-- Review page (approval/index.html): the page talks only to these two public RPCs, because schema talastudio
-- is not exposed through the API. Approval is possible only through ts_review_set (admin / approver),
-- which also records who approved and when. Direct UPDATE on assets is revoked.

alter table talastudio.assets
  add column approved_by text,
  add column approved_at timestamptz;

revoke update (status, approved_for_web, approved_for_social, notes) on talastudio.assets from authenticated;
drop policy if exists approvers_update on talastudio.assets;

create or replace function public.ts_review_list(p_status text default 'inbox', p_limit integer default 100)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not talastudio.is_team() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_status not in ('inbox','approved','rejected') then raise exception 'status must be inbox, approved or rejected'; end if;
  return jsonb_build_object(
    'can_approve', talastudio.can_approve(),
    'me', auth.jwt()->>'email',
    'counts', coalesce((select jsonb_object_agg(s, n) from (
                 select status as s, count(*) as n from talastudio.assets
                 where status in ('inbox','approved','rejected') group by status) c), '{}'::jsonb),
    'items', coalesce((select jsonb_agg(x) from (
        select a.id, a.product_code, p.name as product_name, a.collection_slug, a.view, a.finish, a.status,
               a.storage_path, a.mime, a.bytes, a.width, a.height, a.notes, a.uploaded_email, a.created_at,
               a.approved_for_web, a.approved_for_social, a.approved_by, a.approved_at
        from talastudio.assets a left join talastudio.products p on p.code = a.product_code
        where a.status = p_status
        order by a.created_at desc
        limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb));
end $function$;

create or replace function public.ts_review_set(
  p_id uuid, p_action text, p_web boolean default false, p_social boolean default false, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v talastudio.assets;
  v_me text := lower(auth.jwt()->>'email');
begin
  if not talastudio.can_approve() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into v from talastudio.assets where id = p_id and status in ('inbox','approved','rejected');
  if not found then raise exception 'asset not found or not reviewable'; end if;

  if p_action = 'approve' then
    if not (coalesce(p_web,false) or coalesce(p_social,false)) then raise exception 'choose web, social or both'; end if;
    update talastudio.assets set status = 'approved', approved_for_web = coalesce(p_web,false),
           approved_for_social = coalesce(p_social,false), approved_by = v_me, approved_at = now() where id = p_id;
  elsif p_action = 'reject' then
    update talastudio.assets set status = 'rejected', approved_for_web = false, approved_for_social = false,
           approved_by = v_me, approved_at = now(),
           notes = nullif(btrim(coalesce(notes,'') || case when nullif(btrim(p_note),'') is not null
                      then ' [rejected: ' || left(btrim(p_note), 300) || ']' else '' end), '')
    where id = p_id;
  elsif p_action = 'reopen' then
    update talastudio.assets set status = 'inbox', approved_for_web = false, approved_for_social = false,
           approved_by = null, approved_at = null where id = p_id;
  else
    raise exception 'action must be approve, reject or reopen';
  end if;
  return (select jsonb_build_object('id', id, 'status', status, 'approved_for_web', approved_for_web,
                                    'approved_for_social', approved_for_social, 'approved_by', approved_by)
          from talastudio.assets where id = p_id);
end $function$;

revoke all on function public.ts_review_list(text,integer) from public, anon;
revoke all on function public.ts_review_set(uuid,text,boolean,boolean,text) from public, anon;
grant execute on function public.ts_review_list(text,integer) to authenticated;
grant execute on function public.ts_review_set(uuid,text,boolean,boolean,text) to authenticated;
