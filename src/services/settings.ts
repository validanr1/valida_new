import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  platformName: string;
  description?: string;
  logoPrimaryDataUrl?: string;   // usado no parceiro e login
  logoNegativeDataUrl?: string;  // usado no admin (fundo escuro)
  maintenanceMode: boolean;      // bloquear acesso ao sistema
  allowNewRegistrations: boolean; // permitir criação de novas contas
  supportWhatsapp?: string;       // WhatsApp de suporte
  supportEmail?: string;          // E-mail de suporte
  resendApiKey?: string;          // Chave de API do Resend para envio de e-mails
  emailFromAddress: string;       // Endereço de e-mail padrão para envio
  smtpHost?: string;              // Host do servidor SMTP
  smtpPort?: number;              // Porta do servidor SMTP
  smtpUsername?: string;          // Usuário do SMTP
  smtpPassword?: string;          // Senha do SMTP
  smtpEncryption?: "none" | "tls" | "ssl"; // Tipo de criptografia SMTP
  emailProvider: "resend" | "smtp"; // Novo campo para selecionar o provedor de e-mail
  leadsNotifyEmail?: string;          // Email destino para notificação de novo lead
  emailThemePrimary?: string;     // Cor primária dos e-mails
  emailThemeSecondary?: string;   // Cor secundária dos e-mails
  emailLogoUrl?: string;          // URL do logo para e-mails
};

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'; // Fixed ID for the single settings row

const DEFAULTS: PlatformSettings = {
  platformName: "Valida NR1",
  description: "Avaliação de Riscos Psicossociais",
  logoPrimaryDataUrl: undefined,
  logoNegativeDataUrl: undefined,
  maintenanceMode: false,
  allowNewRegistrations: true,
  supportWhatsapp: "",
  resendApiKey: undefined,
  emailFromAddress: "onboarding@resend.dev",
  smtpHost: undefined,
  smtpPort: undefined,
  smtpUsername: undefined,
  smtpPassword: undefined,
  smtpEncryption: "tls",
  emailProvider: "resend", // Default para o novo campo
  leadsNotifyEmail: "",
};

export async function getSettings(): Promise<PlatformSettings> {
  console.log("getSettings: Tentando buscar configurações da plataforma...");
  // If Supabase is not configured, return defaults immediately
  if ((supabase as any).__shim) {
    console.warn("getSettings: Supabase shim detected. Returning DEFAULTS.");
    return DEFAULTS;
  }
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("getSettings: Erro ao buscar configurações da plataforma:", error);
    // Fallback to defaults if there's an error
    return DEFAULTS;
  }

  if (!data) {
    console.warn("getSettings: Nenhuma configuração encontrada na tabela, retornando padrões.");
    // If no data, return defaults
    return DEFAULTS;
  }

  console.log("getSettings: Dados brutos do Supabase:", data);

  // Map Supabase row to PlatformSettings type
  const mappedSettings: PlatformSettings = {
    platformName: data.platform_name,
    description: data.description ?? undefined,
    logoPrimaryDataUrl: data.logo_primary_data_url ?? undefined,
    logoNegativeDataUrl: data.logo_negative_data_url ?? undefined,
    maintenanceMode: data.maintenance_mode,
    allowNewRegistrations: data.allow_new_registrations,
    supportWhatsapp: data.support_whatsapp ?? undefined,
    supportEmail: data.support_email ?? undefined,
    resendApiKey: data.resend_api_key ?? undefined,
    emailFromAddress: data.email_from_address ?? DEFAULTS.emailFromAddress,
    smtpHost: data.smtp_host ?? undefined,
    smtpPort: data.smtp_port ?? undefined,
    smtpUsername: data.smtp_username ?? undefined,
    smtpPassword: data.smtp_password ?? undefined,
    smtpEncryption: (data.smtp_encryption as "none" | "tls" | "ssl") ?? DEFAULTS.smtpEncryption,
    emailProvider: (data.email_provider as "resend" | "smtp") ?? DEFAULTS.emailProvider, // Novo campo
    leadsNotifyEmail: data.leads_notify_email ?? undefined,
  };
  console.log("getSettings: Configurações mapeadas:", mappedSettings);
  return mappedSettings;
}

export async function saveSettings(next: PlatformSettings): Promise<void> {
  console.log("saveSettings: Tentando salvar configurações da plataforma:", next);
  if ((supabase as any).__shim) {
    console.warn("saveSettings: Supabase shim detected. Skipping DB write (no-op)." );
    return;
  }
  const payload = {
    id: SETTINGS_ID,
    platform_name: next.platformName,
    description: next.description ?? null,
    logo_primary_data_url: next.logoPrimaryDataUrl ?? null,
    logo_negative_data_url: next.logoNegativeDataUrl ?? null,
    maintenance_mode: next.maintenanceMode,
    allow_new_registrations: next.allowNewRegistrations,
    support_whatsapp: next.supportWhatsapp ?? null,
    support_email: next.supportEmail ?? null,
    resend_api_key: next.resendApiKey ?? null,
    email_from_address: next.emailFromAddress,
    smtp_host: next.smtpHost ?? null,
    smtp_port: next.smtpPort ?? null,
    smtp_username: next.smtpUsername ?? null,
    smtp_password: next.smtpPassword ?? null,
    smtp_encryption: next.smtpEncryption ?? null,
    email_provider: next.emailProvider, // Novo campo
    leads_notify_email: next.leadsNotifyEmail ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("platform_settings")
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error("saveSettings: Erro ao salvar configurações da plataforma:", error);
    throw new Error("Failed to save settings to database.");
  }
  console.log("saveSettings: Configurações salvas com sucesso.");
}