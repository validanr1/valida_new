-- Extend RLS for tasks_wagner to allow admin users (SuperAdmin) as defined in role_profiles
drop policy if exists tasks_wagner_admin_select on public.tasks_wagner;
create policy tasks_wagner_admin_select on public.tasks_wagner
for select to authenticated using (
  exists (
    select 1 from public.profiles p
    join public.role_profiles rp on rp.id = p.role_profile_id
    where p.id = auth.uid() and rp.target = 'admin' and rp.name = 'SuperAdmin'
  )
);

drop policy if exists tasks_wagner_admin_modify on public.tasks_wagner;
create policy tasks_wagner_admin_modify on public.tasks_wagner
for all to authenticated using (
  exists (
    select 1 from public.profiles p
    join public.role_profiles rp on rp.id = p.role_profile_id
    where p.id = auth.uid() and rp.target = 'admin' and rp.name = 'SuperAdmin'
  )
) with check (
  exists (
    select 1 from public.profiles p
    join public.role_profiles rp on rp.id = p.role_profile_id
    where p.id = auth.uid() and rp.target = 'admin' and rp.name = 'SuperAdmin'
  )
);