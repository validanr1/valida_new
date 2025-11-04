-- Create function to upsert email templates
CREATE OR REPLACE FUNCTION public.upsert_email_template(
  p_type TEXT,
  p_subject TEXT,
  p_content TEXT,
  p_variables JSONB,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.email_templates (type, subject, content, variables, is_active, updated_at)
  VALUES (p_type, p_subject, p_content, p_variables, p_is_active, now())
  ON CONFLICT (type) 
  DO UPDATE SET
    subject = EXCLUDED.subject,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_email_template TO authenticated;
