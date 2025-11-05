-- Execute no Supabase SQL Editor para verificar os logs de e-mail

-- Ver todos os logs recentes
SELECT 
  id,
  recipient_email,
  template_name,
  subject,
  status,
  created_at,
  error_message
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;

-- Contar por template_name
SELECT 
  template_name,
  status,
  COUNT(*) as total
FROM email_logs
GROUP BY template_name, status
ORDER BY template_name, status;
