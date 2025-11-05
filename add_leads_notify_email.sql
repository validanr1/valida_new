-- Execute este SQL no Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/ymuzggvvslpxaabozmck/sql/new

-- Atualizar com SEU e-mail para receber as notificações
UPDATE public.platform_settings
SET 
  leads_notify_email = 'SEU-EMAIL@DOMINIO.COM',  -- AJUSTE AQUI COM SEU E-MAIL
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verificar se foi atualizado
SELECT 
  id,
  leads_notify_email,
  support_email,
  email_from_address
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
