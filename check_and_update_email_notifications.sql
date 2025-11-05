-- ============================================
-- Script para verificar e configurar notificações por e-mail
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Verificar se a coluna leads_notify_email existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'platform_settings' 
  AND column_name = 'leads_notify_email';

-- 2. Ver configuração atual
SELECT 
  id,
  leads_notify_email,
  support_email,
  email_from_address,
  email_provider
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Atualizar com seu e-mail (AJUSTE O E-MAIL ABAIXO)
-- Descomente e execute após ajustar o e-mail:
/*
UPDATE public.platform_settings
SET 
  leads_notify_email = 'seu-email@dominio.com',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';
*/

-- 4. Verificar se a atualização funcionou
SELECT 
  id,
  leads_notify_email,
  support_email,
  email_from_address,
  updated_at
FROM public.platform_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
