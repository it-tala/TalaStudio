-- 0005_tracker_sync.sql
-- Home for the one-way tracker -> products sync (WEBSITE TRACKER tab only).
--   * planned carton / CBM columns on products (the tracker computes them; the sync only copies the values)
--   * sync_runs: one row per run with the diff
--   * talastudio.sync_products(rows, dry, source): upserts by STANDARD CODE, never deletes, never touches
--     tracker_code (the CODE column), published or any price column (none exist). Returns the diff.
--   * public.ts_sync_products: the only entry point for the job, service_role only.

alter table talastudio.products
  add column carton_w_mm      integer,
  add column carton_d_mm      integer,
  add column carton_h_mm      integer,
  add column cartons_per_item integer,
  add column cbm_calc         numeric(10,3),
  add column cbm_override     numeric(10,3),
  add column cbm_final        numeric(10,3),
  add column qty_per_40hq     integer;

create table talastudio.sync_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  source      text,
  dry_run     boolean not null,
  rows_read   integer,
  added       integer,
  changed     integer,
  missing     integer,
  skipped     integer,
  diff        jsonb
);
alter table talastudio.sync_runs enable row level security;
grant select on talastudio.sync_runs to authenticated;
create policy team_read on talastudio.sync_runs for select to authenticated using (talastudio.is_team());

create or replace function talastudio.sync_products(p_rows jsonb, p_dry boolean default true, p_source text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c_cols constant text[] := array['collection','collection_slug','room','item_type','name','w_mm','d_mm','h_mm',
      'finishes','blend_file','carton_w_mm','carton_d_mm','carton_h_mm','cartons_per_item','cbm_calc',
      'cbm_override','cbm_final','qty_per_40hq'];
  jr jsonb; v_code text; v_old jsonb; v_changes jsonb; k text;
  v_added jsonb := '[]'; v_changed jsonb := '[]'; v_skipped jsonb := '[]'; v_missing jsonb;
  v_seen text[] := '{}'; v_n int := 0; v_result jsonb; v_id uuid := gen_random_uuid();
begin
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a json array'; end if;
  for jr in select * from jsonb_array_elements(p_rows) loop
    v_n := v_n + 1;
    v_code := jr->>'code';
    begin
      if v_code is null or v_code !~ '^[A-Z]{2}-[0-9]{3}$' then
        v_skipped := v_skipped || jsonb_build_object('code', v_code, 'reason', 'bad code');
        continue;
      end if;
      v_seen := v_seen || v_code;
      select to_jsonb(p) into v_old from talastudio.products p where p.code = v_code;
      if v_old is null then
        if not p_dry then
          insert into talastudio.products (code, collection, collection_slug, room, item_type, name, w_mm, d_mm, h_mm,
              finishes, blend_file, carton_w_mm, carton_d_mm, carton_h_mm, cartons_per_item, cbm_calc, cbm_override,
              cbm_final, qty_per_40hq)
          select v_code, r.collection, r.collection_slug, r.room, r.item_type, r.name, r.w_mm, r.d_mm, r.h_mm,
                 coalesce(r.finishes, '{}'), r.blend_file, r.carton_w_mm, r.carton_d_mm, r.carton_h_mm,
                 r.cartons_per_item, r.cbm_calc, r.cbm_override, r.cbm_final, r.qty_per_40hq
          from jsonb_populate_record(null::talastudio.products, jr) r;
        end if;
        v_added := v_added || jsonb_build_object('code', v_code, 'name', jr->>'name', 'collection_slug', jr->>'collection_slug');
      else
        v_changes := '{}';
        foreach k in array c_cols loop
          if jr ? k and (v_old->k) is distinct from (jr->k) then
            v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', jr->k));
          end if;
        end loop;
        if v_changes <> '{}'::jsonb then
          if not p_dry then
            update talastudio.products p set
              (collection, collection_slug, room, item_type, name, w_mm, d_mm, h_mm, finishes, blend_file, carton_w_mm,
               carton_d_mm, carton_h_mm, cartons_per_item, cbm_calc, cbm_override, cbm_final, qty_per_40hq) =
              (select r.collection, r.collection_slug, r.room, r.item_type, r.name, r.w_mm, r.d_mm, r.h_mm, r.finishes,
                      r.blend_file, r.carton_w_mm, r.carton_d_mm, r.carton_h_mm, r.cartons_per_item, r.cbm_calc,
                      r.cbm_override, r.cbm_final, r.qty_per_40hq
               from jsonb_populate_record(p, (select jsonb_object_agg(e.key, e.value->'new') from jsonb_each(v_changes) e)) r)
            where p.code = v_code;
          end if;
          v_changed := v_changed || jsonb_build_object('code', v_code, 'changes', v_changes);
        end if;
      end if;
    exception when others then
      v_skipped := v_skipped || jsonb_build_object('code', v_code, 'reason', sqlerrm);
    end;
  end loop;

  select coalesce(jsonb_agg(code order by code), '[]') into v_missing
  from talastudio.products where code <> all (v_seen);

  v_result := jsonb_build_object('run_id', v_id, 'dry_run', p_dry, 'rows_read', v_n,
      'added', v_added, 'changed', v_changed, 'missing_in_tracker', v_missing, 'skipped', v_skipped);
  insert into talastudio.sync_runs (id, source, dry_run, rows_read, added, changed, missing, skipped, diff)
  values (v_id, p_source, p_dry, v_n, jsonb_array_length(v_added), jsonb_array_length(v_changed),
          jsonb_array_length(v_missing), jsonb_array_length(v_skipped), v_result);
  return v_result;
end $function$;

create or replace function public.ts_sync_products(p_rows jsonb, p_dry boolean default true, p_source text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return talastudio.sync_products(p_rows, p_dry, p_source);
end $function$;

revoke all on function talastudio.sync_products(jsonb,boolean,text) from public, anon, authenticated;
revoke all on function public.ts_sync_products(jsonb,boolean,text) from public, anon, authenticated;
grant execute on function public.ts_sync_products(jsonb,boolean,text) to service_role;
