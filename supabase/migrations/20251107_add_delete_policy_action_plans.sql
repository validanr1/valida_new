-- Add DELETE policy for action_plans table
begin;

-- DELETE policy for global action plans (any authenticated user can delete global plans)
drop policy if exists delete_global_action_plans on public.action_plans;
create policy delete_global_action_plans
  on public.action_plans for delete to authenticated
  using (is_global = true);

-- DELETE policy for partner-owned action plans
drop policy if exists delete_partner_own on public.action_plans;
create policy delete_partner_own
  on public.action_plans for delete to authenticated
  using (is_global = false and partner_id = nullif(auth.jwt() ->> 'partner_id','')::uuid);

commit;
