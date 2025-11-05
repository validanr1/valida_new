-- Execute este SQL no Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/ymuzggvvslpxaabozmck/sql/new

-- 1. Ver configuração atual
SELECT 
  id,
  leads_notify_email,
  support_email,
  email_from_address,
  platform_name
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. AJUSTE O E-MAIL ABAIXO e execute:
UPDATE public.platform_settings
SET 
  leads_notify_email = 'SEU-EMAIL-AQUI@DOMINIO.COM',  -- <<<< AJUSTE AQUI
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Confirmar que foi atualizado
SELECT 
  id,
  leads_notify_email,
  support_email,
  email_from_address,
  updated_at
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
