-- ============================================
-- COPIE E EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- https://supabase.com/dashboard/project/ymuzggvvslpxaabozmck/sql

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage task comments" ON public.task_comments;

-- Criar política para visualizar tarefas
CREATE POLICY "Admins can view all tasks" 
  ON public.tasks 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager', 'AdminViewer')
    )
  );

-- Criar política para inserir tarefas
CREATE POLICY "Admins can insert tasks" 
  ON public.tasks 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  );

-- Criar política para atualizar tarefas
CREATE POLICY "Admins can update tasks" 
  ON public.tasks 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  );

-- Criar política para excluir tarefas
CREATE POLICY "Admins can delete tasks" 
  ON public.tasks 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key = 'AdminSuper'
    )
  );

-- Criar política para visualizar comentários de tarefas
CREATE POLICY "Admins can view task comments" 
  ON public.task_comments 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager', 'AdminViewer')
    )
  );

-- Criar política para inserir comentários de tarefas
CREATE POLICY "Admins can insert task comments" 
  ON public.task_comments 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  );

-- Criar política para atualizar comentários de tarefas
CREATE POLICY "Admins can update task comments" 
  ON public.task_comments 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key IN ('AdminSuper', 'AdminManager')
    )
  );

-- Criar política para excluir comentários de tarefas
CREATE POLICY "Admins can delete task comments" 
  ON public.task_comments 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.role_profiles rp 
      JOIN public.profiles p 
      ON p.role_profile_id = rp.id 
      WHERE p.id = auth.uid() 
      AND rp.key = 'AdminSuper'
    )
  );
===========================================
