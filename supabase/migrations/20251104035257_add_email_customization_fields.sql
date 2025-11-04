-- Add email customization fields to platform_settings table
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS email_theme_primary TEXT DEFAULT '#667eea',
ADD COLUMN IF NOT EXISTS email_theme_secondary TEXT DEFAULT '#764ba2',
ADD COLUMN IF NOT EXISTS email_logo_url TEXT;

-- Update existing row with defaults if it exists
UPDATE public.platform_settings
SET 
  email_theme_primary = COALESCE(email_theme_primary, '#667eea'),
  email_theme_secondary = COALESCE(email_theme_secondary, '#764ba2')
WHERE id = '00000000-0000-0000-0000-000000000001';
