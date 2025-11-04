-- Temporary relaxed UPDATE policy to unblock Admin edits on global action plans
begin;

alter table public.action_plans enable row level security;

drop policy if exists update_global_any_authenticated on public.action_plans;
create policy update_global_any_authenticated
  on public.action_plans
  for update
  to authenticated
  using (
    is_global = true
    and partner_id is null
  )
  with check (
    is_global = true
    and partner_id is null
  );

commit;

