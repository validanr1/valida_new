-- Atualizar variáveis dos templates de email
-- Este script define as variáveis corretas para cada tipo de template

-- Template: welcome (Boas-vindas)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "partner_name", "platform_name", "recipient_email", "temp_password", "activation_link", "theme_primary", "theme_secondary", "logo_url", "support_email", "support_whatsapp"]'::jsonb
WHERE type = 'welcome';

-- Template: activation_complete (Ativação Concluída)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "partner_name", "platform_name", "dashboard_link", "theme_primary", "theme_secondary", "logo_url", "support_email", "support_whatsapp"]'::jsonb
WHERE type = 'activation_complete';

-- Template: suspension (Suspensão)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "partner_name", "platform_name", "reason", "support_email", "support_whatsapp", "logo_url"]'::jsonb
WHERE type = 'suspension';

-- Template: reactivation (Reativação)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "partner_name", "platform_name", "dashboard_link", "logo_url", "support_email", "support_whatsapp"]'::jsonb
WHERE type = 'reactivation';

-- Template: inactivation (Inativação)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "partner_name", "platform_name", "reason", "support_email", "support_whatsapp", "logo_url"]'::jsonb
WHERE type = 'inactivation';

-- Template: reminder (Lembrete)
UPDATE public.email_templates
SET variables = '["first_name", "last_name", "platform_name", "reason", "dashboard_link", "logo_url", "support_email", "support_whatsapp"]'::jsonb
WHERE type = 'reminder';

-- Inserir templates vazios se não existirem (para facilitar configuração no painel)
INSERT INTO public.email_templates (type, subject, body_html, variables, is_active)
VALUES 
  ('welcome', 'Bem-vindo à {{platform_name}}, {{first_name}}!', '', '["first_name", "last_name", "partner_name", "platform_name", "recipient_email", "temp_password", "activation_link", "theme_primary", "theme_secondary", "logo_url", "support_email", "support_whatsapp"]'::jsonb, false),
  ('activation_complete', 'Conta Ativada - Bem-vindo à {{platform_name}}!', '', '["first_name", "last_name", "partner_name", "platform_name", "dashboard_link", "theme_primary", "theme_secondary", "logo_url", "support_email", "support_whatsapp"]'::jsonb, false),
  ('suspension', 'Conta Temporariamente Suspensa - {{partner_name}}', '', '["first_name", "last_name", "partner_name", "platform_name", "reason", "support_email", "support_whatsapp", "logo_url"]'::jsonb, false),
  ('reactivation', 'Conta Reativada - Acesso Liberado - {{partner_name}}', '', '["first_name", "last_name", "partner_name", "platform_name", "dashboard_link", "logo_url", "support_email", "support_whatsapp"]'::jsonb, false),
  ('inactivation', 'Conta Inativada', '', '["first_name", "last_name", "partner_name", "platform_name", "reason", "support_email", "support_whatsapp", "logo_url"]'::jsonb, false),
  ('reminder', 'Lembrete Importante - {{platform_name}}', '', '["first_name", "last_name", "platform_name", "reason", "dashboard_link", "logo_url", "support_email", "support_whatsapp"]'::jsonb, false)
ON CONFLICT (type) DO NOTHING;

-- Comentário explicativo
COMMENT ON TABLE public.email_templates IS 'Tabela de templates de email transacionais. Os templates HTML devem ser configurados via painel administrativo.';
