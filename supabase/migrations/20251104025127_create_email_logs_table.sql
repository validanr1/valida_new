-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_partner ON public.email_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: SuperAdmin pode ver todos os logs
DO $$ BEGIN
  CREATE POLICY "SuperAdmin can view all email logs"
    ON public.email_logs
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.role_profiles rp
        JOIN public.profiles p ON p.role_profile_id = rp.id
        WHERE p.id = auth.uid()
        AND rp.name = 'SuperAdmin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: PartnerAdmin pode ver apenas logs do seu parceiro
DO $$ BEGIN
  CREATE POLICY "PartnerAdmin can view own partner email logs"
    ON public.email_logs
    FOR SELECT
    TO authenticated
    USING (
      partner_id IN (
        SELECT pm.partner_id
        FROM public.partner_members pm
        WHERE pm.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Grant permissions
GRANT SELECT ON public.email_logs TO authenticated;
GRANT INSERT ON public.email_logs TO service_role;
