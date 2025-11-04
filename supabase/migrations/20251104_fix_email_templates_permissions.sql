-- Adicionar permissão de DELETE e UPSERT para email_templates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

-- Garantir que a policy de SuperAdmin permite todas as operações
DROP POLICY IF EXISTS "SuperAdmin can manage email templates" ON public.email_templates;

CREATE POLICY "SuperAdmin can manage email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_profiles rp
      JOIN public.profiles p ON p.role_profile_id = rp.id
      WHERE p.id = auth.uid()
      AND rp.name = 'SuperAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_profiles rp
      JOIN public.profiles p ON p.role_profile_id = rp.id
      WHERE p.id = auth.uid()
      AND rp.name = 'SuperAdmin'
    )
  );
