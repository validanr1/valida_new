-- Verificar se a coluna leads_notify_email existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'platform_settings' 
  AND column_name = 'leads_notify_email';

-- Ver valor atual
SELECT id, leads_notify_email, support_email, email_from_address
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
