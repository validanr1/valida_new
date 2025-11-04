-- Add support_email field to platform_settings table
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS support_email TEXT;

-- Add comment
COMMENT ON COLUMN public.platform_settings.support_email IS 'E-mail de suporte da plataforma';
