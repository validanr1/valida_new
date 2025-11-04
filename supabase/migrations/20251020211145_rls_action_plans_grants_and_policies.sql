-- Grants + RLS policies for action_plans (idempotent)
begin;

-- Basic grants for authenticated
grant select, insert, update, delete on table public.action_plans to authenticated;

-- Ensure RLS is enabled
alter table public.action_plans enable row level security;

-- SELECT for authenticated
drop policy if exists select_all_authenticated on public.action_plans;
create policy select_all_authenticated
  on public.action_plans for select to authenticated using (true);

-- Relaxed global INSERT to unblock admin while claims are aligned
drop policy if exists insert_global_any_authenticated on public.action_plans;
create policy insert_global_any_authenticated
  on public.action_plans for insert to authenticated
  with check (is_global = true and partner_id is null);

-- Partner own INSERT
drop policy if exists insert_partner_own on public.action_plans;
create policy insert_partner_own
  on public.action_plans for insert to authenticated
  with check (is_global = false and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid);

-- Partner own UPDATE
drop policy if exists update_partner_own on public.action_plans;
create policy update_partner_own
  on public.action_plans for update to authenticated
  using (is_global = false and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid)
  with check (is_global = false and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid);

commit;

