-- ============================================
-- EXECUTAR ESTE SQL NO SUPABASE DASHBOARD
-- ============================================
-- Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/sql/new
-- Cole este código e clique em "Run"
-- ============================================

-- Add DELETE policy for action_plans table
BEGIN;

-- DELETE policy for global action plans (any authenticated user can delete global plans)
DROP POLICY IF EXISTS delete_global_action_plans ON public.action_plans;
CREATE POLICY delete_global_action_plans
  ON public.action_plans FOR DELETE TO authenticated
  USING (is_global = true);

-- DELETE policy for partner-owned action plans
DROP POLICY IF EXISTS delete_partner_own ON public.action_plans;
CREATE POLICY delete_partner_own
  ON public.action_plans FOR DELETE TO authenticated
  USING (is_global = false AND partner_id = NULLIF(auth.jwt() ->> 'partner_id','')::uuid);

COMMIT;

-- ============================================
-- APÓS EXECUTAR, A EXCLUSÃO FUNCIONARÁ!
-- ============================================
