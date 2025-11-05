import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  action: string;
  recipient_email: string;
  data: Record<string, any>;
}

// Mapeamento de actions para tipos de template
const ACTION_TO_TYPE_MAP: Record<string, string> = {
  'send_welcome': 'welcome',
  'send_activation_complete': 'activation_complete',
  'send_suspension': 'suspension',
  'send_reactivation': 'reactivation',
  'send_inactivation': 'inactivation',
  'send_reminder': 'reminder',
  // Admin notifications
  'notify_login': 'notification',
  'notify_signup': 'notification',
};

// Função para substituir variáveis no template
function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  
  // Substituir variáveis simples {{variable}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
    result = result.replace(regex, value);
  });
  
  // Processar condicionais simples {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, variable, content) => {
    return data[variable] ? content : '';
  });
  
  // Remover quaisquer variáveis não substituídas (fallback de segurança)
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

// Buscar template do banco de dados
async function getEmailTemplate(action: string, data: Record<string, any>) {
  const templateType = ACTION_TO_TYPE_MAP[action];
  
  if (!templateType) {
    throw new Error(`Template type not found for action: ${action}`);
  }
  
  // Simple admin notifications
  if (action === 'notify_login') {
    const userEmail = data.user_email || 'desconhecido';
    const when = data.when || new Date().toISOString();
    const ip = data.ip || '';
    const ua = data.user_agent || '';
    return {
      subject: `Alerta: Novo login - ${userEmail}`,
      html: `
        <p>Um login foi realizado na plataforma.</p>
        <ul>
          <li><strong>Usuário:</strong> ${userEmail}</li>
          <li><strong>Data/Hora:</strong> ${when}</li>
          ${ip ? `<li><strong>IP:</strong> ${ip}</li>` : ''}
          ${ua ? `<li><strong>User-Agent:</strong> ${ua}</li>` : ''}
        </ul>
      `
    };
  }
  if (action === 'notify_signup') {
    const userEmail = data.user_email || 'desconhecido';
    const when = data.when || new Date().toISOString();
    const name = data.name || data.partner_name || '';
    const plan = data.plan || '';
    return {
      subject: `Alerta: Novo cadastro - ${userEmail}`,
      html: `
        <p>Um novo cadastro foi realizado na plataforma.</p>
        <ul>
          ${name ? `<li><strong>Nome:</strong> ${name}</li>` : ''}
          <li><strong>E-mail:</strong> ${userEmail}</li>
          ${plan ? `<li><strong>Plano:</strong> ${plan}</li>` : ''}
          <li><strong>Data/Hora:</strong> ${when}</li>
        </ul>
      `
    };
  }
  
  // Buscar template do banco
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('subject, body_html')
    .eq('type', templateType)
    .eq('is_active', true)
    .single();
  
  if (error || !template) {
    console.error('Template not found in database, using fallback');
    // Fallback para templates hardcoded (mantém compatibilidade)
    return getFallbackTemplate(action, data);
  }
  
  // Substituir variáveis no assunto e conteúdo
  const subject = replaceVariables(template.subject, data);
  const html = replaceVariables(template.body_html, data);
  
  return { subject, html };
}

// Templates de fallback (caso não encontre no banco)
function getFallbackTemplate(action: string, data: any) {
  if (action === 'send_welcome') {
    const primaryColor = data.theme_primary || '#667eea';
    const secondaryColor = data.theme_secondary || '#764ba2';
    const logoUrl = data.logo_url || '';
    const platformName = data.platform_name || 'Valida NR1';
    
    return {
      subject: `Bem-vindo à ${platformName}!`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
          .button:hover { opacity: 0.9; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .credentials { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${primaryColor}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${platformName}" class="logo" />` : ''}
            <h1>🎉 Bem-vindo, ${data.first_name}!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${data.first_name}</strong>,</p>
            <p>Sua conta de parceiro <strong>${data.partner_name}</strong> foi criada com sucesso na plataforma Valida NR1!</p>
            
            <div class="credentials">
              <h3>📧 Suas credenciais de acesso:</h3>
              <p><strong>E-mail:</strong> ${data.recipient_email}</p>
              <p><strong>Senha temporária:</strong> ${data.temp_password || "(enviada separadamente)"}</p>
            </div>

            <p>Para começar a usar a plataforma, clique no botão abaixo e complete o processo de ativação:</p>
            
            <div style="text-align: center;">
              <a href="${data.activation_link}" class="button">Ativar Minha Conta</a>
            </div>

            <p><strong>Próximos passos:</strong></p>
            <ol>
              <li>Acesse o link de ativação acima</li>
              <li>Complete o onboarding (configuração inicial)</li>
              <li>Comece a criar empresas e avaliações</li>
            </ol>

            <p>Se tiver dúvidas, entre em contato com nosso suporte.</p>
            
            <p>Atenciosamente,<br><strong>Equipe Valida NR1</strong></p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
  }
  
  if (action === 'send_activation_complete') {
    return {
      subject: "✅ Ativação Concluída - Bem-vindo à Valida NR1!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
            .button:hover { opacity: 0.9; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Conta Ativada!</h1>
            </div>
            <div class="content">
              <p>Parabéns, <strong>${data.first_name || 'Parceiro'}</strong>!</p>
              <p>Sua conta foi ativada com sucesso. Você já pode começar a usar todos os recursos da plataforma.</p>
              
              <div style="text-align: center;">
                <a href="${data.dashboard_link || 'https://painel.validanr1.com.br'}" class="button">Acessar Painel</a>
              </div>

              <p><strong>Recursos disponíveis:</strong></p>
              <ul>
                <li>Gerenciamento de empresas e colaboradores</li>
                <li>Criação e envio de avaliações</li>
                <li>Relatórios e análises detalhadas</li>
                <li>Planos de ação personalizados</li>
              </ul>

              <p>Bom trabalho!<br><strong>Equipe Valida NR1</strong></p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
  
  if (action === 'send_suspension') {
    return {
      subject: "⚠️ Conta Temporariamente Suspensa",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Conta Suspensa</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${data.first_name || 'Parceiro'}</strong>,</p>
              <p>Informamos que a conta do parceiro <strong>${data.partner_name || 'sua empresa'}</strong> foi temporariamente suspensa.</p>
              
              <div class="alert">
                <p><strong>Motivo:</strong> ${data.reason || "Pendências administrativas"}</p>
              </div>

              <p><strong>O que isso significa?</strong></p>
              <p>Seu acesso à plataforma está temporariamente bloqueado até que a situação seja regularizada.</p>

              <p><strong>Como resolver?</strong></p>
              <p>Entre em contato com nosso suporte:</p>
              <ul>
                <li>📱 WhatsApp: ${data.support_whatsapp || "(consulte seu contato)"}</li>
                <li>📧 E-mail: suporte@validanr1.com.br</li>
              </ul>

              <p>Atenciosamente,<br><strong>Equipe Valida NR1</strong></p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
  
  if (action === 'send_reactivation') {
    return {
      subject: "✅ Conta Reativada - Acesso Liberado",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
            .button:hover { opacity: 0.9; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Conta Reativada!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${data.first_name || 'Parceiro'}</strong>,</p>
              <p>Ótimas notícias! A conta do parceiro <strong>${data.partner_name || 'sua empresa'}</strong> foi reativada.</p>
              
              <p>Seu acesso à plataforma foi totalmente restaurado e você já pode voltar a usar todos os recursos.</p>

              <div style="text-align: center;">
                <a href="${data.dashboard_link || 'https://painel.validanr1.com.br'}" class="button">Acessar Painel</a>
              </div>

              <p>Obrigado pela compreensão!<br><strong>Equipe Valida NR1</strong></p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
  
  if (action === 'send_inactivation') {
    return {
      subject: "❌ Conta Inativada",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Conta Inativada</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${data.first_name || 'Parceiro'}</strong>,</p>
              <p>Informamos que a conta do parceiro <strong>${data.partner_name || 'sua empresa'}</strong> foi inativada.</p>
              
              <div class="alert">
                <p><strong>Motivo:</strong> ${data.reason || "Inativação administrativa"}</p>
              </div>

              <p>Se você acredita que isso é um erro ou deseja reativar sua conta, entre em contato com nosso suporte:</p>
              <ul>
                <li>📧 E-mail: suporte@validanr1.com.br</li>
              </ul>

              <p>Atenciosamente,<br><strong>Equipe Valida NR1</strong></p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático. Por favor, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
  
  // Retornar template padrão genérico se não encontrar
  return {
    subject: 'Notificação',
    html: '<p>Você recebeu uma notificação.</p>'
  };
}

// Templates antigos (não usados mais, mantidos para referência)
const oldTemplates = {
  send_activation_complete: (data: any) => ({
    subject: "✅ Ativação Concluída - Bem-vindo à Valida NR1!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Conta Ativada!</h1>
          </div>
          <div class="content">
            <p>Parabéns, <strong>${data.first_name}</strong>!</p>
            <p>Sua conta foi ativada com sucesso. Você já pode começar a usar todos os recursos da plataforma.</p>
            
            <div style="text-align: center;">
              <a href="${data.dashboard_link}" class="button">Acessar Painel</a>
            </div>

            <p><strong>Recursos disponíveis:</strong></p>
            <ul>
              <li>Gerenciamento de empresas e colaboradores</li>
              <li>Criação e envio de avaliações</li>
              <li>Relatórios e análises detalhadas</li>
              <li>Planos de ação personalizados</li>
            </ul>

            <p>Bom trabalho!<br><strong>Equipe Valida NR1</strong></p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  send_suspension: (data: any) => ({
    subject: "⚠️ Conta Temporariamente Suspensa",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
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
            <p>Olá, <strong>${data.first_name}</strong>,</p>
            <p>Informamos que a conta do parceiro <strong>${data.partner_name}</strong> foi temporariamente suspensa.</p>
            
            <div class="alert">
              <p><strong>Motivo:</strong> ${data.reason || "Pendências administrativas"}</p>
            </div>

            <p><strong>O que isso significa?</strong></p>
            <p>Seu acesso à plataforma está temporariamente bloqueado até que a situação seja regularizada.</p>

            <p><strong>Como resolver?</strong></p>
            <p>Entre em contato com nosso suporte:</p>
            <ul>
              <li>📱 WhatsApp: ${data.support_whatsapp || "(consulte seu contato)"}</li>
              <li>📧 E-mail: suporte@validanr1.com.br</li>
            </ul>

            <p>Atenciosamente,<br><strong>Equipe Valida NR1</strong></p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  send_reactivation: (data: any) => ({
    subject: "✅ Conta Reativada - Acesso Liberado",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Conta Reativada!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${data.first_name}</strong>,</p>
            <p>Ótimas notícias! A conta do parceiro <strong>${data.partner_name}</strong> foi reativada.</p>
            
            <p>Seu acesso à plataforma foi totalmente restaurado e você já pode voltar a usar todos os recursos.</p>

            <div style="text-align: center;">
              <a href="${data.dashboard_link}" class="button">Acessar Painel</a>
            </div>

            <p>Obrigado pela compreensão!<br><strong>Equipe Valida NR1</strong></p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

async function sendEmail(emailData: EmailData) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  // Buscar template do banco de dados
  const { subject, html } = await getEmailTemplate(emailData.action, emailData.data);

  // Envia via Resend
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: emailData.recipient_email,
      subject,
      html,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Resend API error: ${JSON.stringify(result)}`);
  }

  // Log no banco
  await supabase.from("email_logs").insert({
    recipient_email: emailData.recipient_email,
    template_name: emailData.action,
    subject,
    status: "sent",
    metadata: { resend_id: result.id, data: emailData.data },
  });

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailData = await req.json();

    if (!emailData.action || !emailData.recipient_email) {
      return new Response(
        JSON.stringify({ ok: false, error: "action e recipient_email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendEmail(emailData);

    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-email] Error:", error);

    // Log de erro no banco
    try {
      const emailData: EmailData = await req.json();
      await supabase.from("email_logs").insert({
        recipient_email: emailData.recipient_email,
        template_name: emailData.action,
        status: "failed",
        error_message: error.message,
        metadata: { data: emailData.data },
      });
    } catch {}

    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
