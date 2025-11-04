-- Drop existing table and recreate with correct schema matching the frontend
DROP TABLE IF EXISTS public.email_templates CASCADE;

-- Create email_templates table with fields matching the EmailTemplate type in frontend
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'welcome',
    'activation_complete',
    'suspension',
    'reactivation',
    'inactivation',
    'reminder'
  )),
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_email_templates_type ON public.email_templates(type);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: SuperAdmin can manage email templates
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

-- Create or replace upsert function matching the new schema
CREATE OR REPLACE FUNCTION public.upsert_email_template(
  p_type TEXT,
  p_subject TEXT,
  p_body_html TEXT,
  p_variables JSONB,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.email_templates (type, subject, body_html, variables, is_active, updated_at)
  VALUES (p_type, p_subject, p_body_html, p_variables, p_is_active, now())
  ON CONFLICT (type) 
  DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_email_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_email_template TO service_role;
