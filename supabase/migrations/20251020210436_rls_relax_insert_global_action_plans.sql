-- Temporary relaxed policy to unblock Admin global inserts
begin;

alter table public.action_plans enable row level security;

drop policy if exists insert_global_any_authenticated on public.action_plans;
create policy insert_global_any_authenticated
  on public.action_plans
  for insert
  to authenticated
  with check (
    is_global = true
    and partner_id is null
  );

commit;

