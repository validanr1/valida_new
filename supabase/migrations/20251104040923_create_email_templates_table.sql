-- Create email_templates table for customizable email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'welcome',
    'activation_complete',
    'suspension',
    'reactivation',
    'inactivation',
    'reminder',
    'password_reset',
    'new_user'
  )),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$ BEGIN
  ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS subject TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS content TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: SuperAdmin pode gerenciar templates
DO $$ BEGIN
  CREATE POLICY "SuperAdmin can manage email templates"
    ON public.email_templates
    FOR ALL
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.email_templates TO authenticated;
GRANT SELECT ON public.email_templates TO service_role;

-- Insert default templates
INSERT INTO public.email_templates (type, subject, content, variables) VALUES
(
  'welcome',
  'Bem-vindo à {{platform_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, {{theme_primary}} 0%, {{theme_secondary}} 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: {{theme_primary}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .credentials { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid {{theme_primary}}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logo_url}}<img src="{{logo_url}}" alt="{{platform_name}}" class="logo" />{{/if}}
      <h1>🎉 Bem-vindo, {{first_name}}!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>{{first_name}}</strong>,</p>
      <p>Sua conta de parceiro <strong>{{partner_name}}</strong> foi criada com sucesso na plataforma {{platform_name}}!</p>
      
      <div class="credentials">
        <h3>📧 Suas credenciais de acesso:</h3>
        <p><strong>E-mail:</strong> {{recipient_email}}</p>
        <p><strong>Senha temporária:</strong> {{temp_password}}</p>
      </div>

      <p>Para começar a usar a plataforma, clique no botão abaixo e complete o processo de ativação:</p>
      
      <div style="text-align: center;">
        <a href="{{activation_link}}" class="button">Ativar Minha Conta</a>
      </div>

      <p><strong>Próximos passos:</strong></p>
      <ol>
        <li>Acesse o link de ativação acima</li>
        <li>Complete o onboarding (configuração inicial)</li>
        <li>Comece a criar empresas e avaliações</li>
      </ol>

      <p>Se tiver dúvidas, entre em contato com nosso suporte.</p>
      
      <p>Atenciosamente,<br><strong>Equipe {{platform_name}}</strong></p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>',
  '["first_name", "partner_name", "platform_name", "recipient_email", "temp_password", "activation_link", "theme_primary", "theme_secondary", "logo_url"]'::jsonb
),
(
  'suspension',
  '⚠️ Conta Temporariamente Suspensa',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Conta Suspensa</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{first_name}}</strong>,</p>
      <p>Informamos que a conta do parceiro <strong>{{partner_name}}</strong> foi temporariamente suspensa.</p>
      
      <div class="alert">
        <p><strong>Motivo:</strong> {{reason}}</p>
      </div>

      <p><strong>O que isso significa?</strong></p>
      <p>Seu acesso à plataforma está temporariamente bloqueado até que a situação seja regularizada.</p>

      <p><strong>Como resolver?</strong></p>
      <p>Entre em contato com nosso suporte:</p>
      <ul>
        <li>📱 WhatsApp: {{support_whatsapp}}</li>
        <li>📧 E-mail: suporte@validanr1.com.br</li>
      </ul>

      <p>Atenciosamente,<br><strong>Equipe {{platform_name}}</strong></p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>',
  '["first_name", "partner_name", "platform_name", "reason", "support_whatsapp"]'::jsonb
)
ON CONFLICT (type) DO NOTHING;
