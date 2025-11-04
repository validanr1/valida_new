-- RLS policies for action_plans: Admin (globals) and Partner (own)
begin;

-- Ensure RLS is enabled
alter table public.action_plans enable row level security;

-- SELECT for all authenticated
drop policy if exists select_all_authenticated on public.action_plans;
create policy select_all_authenticated
  on public.action_plans
  for select
  to authenticated
  using (true);

-- INSERT global by Admin (role claim)
drop policy if exists insert_global_admin on public.action_plans;
create policy insert_global_admin
  on public.action_plans
  for insert
  to authenticated
  with check (
    is_global = true
    and partner_id is null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- UPDATE global by Admin
drop policy if exists update_global_admin on public.action_plans;
create policy update_global_admin
  on public.action_plans
  for update
  to authenticated
  using (
    is_global = true
    and partner_id is null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    is_global = true
    and partner_id is null
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- INSERT partner's own plans
drop policy if exists insert_partner_own on public.action_plans;
create policy insert_partner_own
  on public.action_plans
  for insert
  to authenticated
  with check (
    is_global = false
    and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid
  );

-- UPDATE partner's own plans
drop policy if exists update_partner_own on public.action_plans;
create policy update_partner_own
  on public.action_plans
  for update
  to authenticated
  using (
    is_global = false
    and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid
  )
  with check (
    is_global = false
    and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid
  );

commit;

