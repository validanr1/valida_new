import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSettings, saveSettings, type PlatformSettings } from "@/services/settings";
import { showError, showSuccess } from "@/utils/toast";
import AccessProfiles from "@/components/admin/settings/AccessProfiles";
import Questionnaires from "@/components/admin/settings/Questionnaires";
import SimpleManager from "@/components/admin/settings/SimpleManager";
import EmailTemplates from "@/components/admin/settings/EmailTemplates";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserManagement from "@/pages/admin/UserManagement";

// Função de formatação de telefone (reutilizada de Partners.tsx)
function formatPhoneBR(input: string) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 11);
  const d = digits.split("");
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${digits}`;
  if (d.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (d.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const Settings = () => {
  const { session } = useSession();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [logoPrimaryPreview, setLogoPrimaryPreview] = useState<string | undefined>(undefined);
  const [logoNegativePreview, setLogoNegativePreview] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadInitialSettings = async () => {
      setLoading(true);
      try {
        const fetchedSettings = await getSettings();
        if (mounted) {
          setSettings(fetchedSettings);
          setLogoPrimaryPreview(fetchedSettings.logoPrimaryDataUrl);
          setLogoNegativePreview(fetchedSettings.logoNegativeDataUrl);
        }
      } catch (error) {
        console.error("Settings: Falha ao carregar as configurações iniciais:", error);
        showError("Falha ao carregar as configurações iniciais.");
        if (mounted) setSettings(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadInitialSettings();
    return () => { mounted = false; };
  }, [session?.user_id]);

  const onFileChange = (file: File, which: "primary" | "negative") => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (which === "primary") {
        setLogoPrimaryPreview(dataUrl);
        setSettings((s) => (s ? { ...s, logoPrimaryDataUrl: dataUrl } : null));
      } else {
        setLogoNegativePreview(dataUrl);
        setSettings((s) => (s ? { ...s, logoNegativeDataUrl: dataUrl } : null));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (which: "primary" | "negative") => {
    if (which === "primary") {
      setLogoPrimaryPreview(undefined);
      setSettings((s) => (s ? { ...s, logoPrimaryDataUrl: undefined } : null));
    } else {
      setLogoNegativePreview(undefined);
      setSettings((s) => (s ? { ...s, logoNegativeDataUrl: undefined } : null));
    }
  };

  const onSaveGeneral = async () => {
    if (!settings) {
      showError("Nenhuma configuração para salvar.");
      return;
    }
    setIsSaving(true);
    try {
      await saveSettings(settings);
      showSuccess("Configurações salvas.");
    } catch (error) {
      console.error("Failed to save general settings:", error);
      showError("Falha ao salvar as configurações gerais.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <LoadingSpinner size={32} className="mx-auto" />
        <p className="mt-2">Carregando configurações...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Não foi possível carregar as configurações. Verifique o console para erros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste preferências da plataforma e módulos administrativos.</p>
      </div>

      <Card className="p-4">
        <Tabs defaultValue="geral">
          <TabsList className="w-full grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="geral" className="w-full">Geral</TabsTrigger>
            <TabsTrigger value="usuarios" className="w-full">Usuários</TabsTrigger>
            <TabsTrigger value="emails" className="w-full">E-mails</TabsTrigger>
            <TabsTrigger value="questionarios" className="w-full">Questionários</TabsTrigger>
            <TabsTrigger value="integracoes" className="w-full">Integrações</TabsTrigger>
            <TabsTrigger value="tipos-avaliacao" className="w-full">Tipos de Avaliação</TabsTrigger>
            <TabsTrigger value="graus-risco" className="w-full">Graus de Risco</TabsTrigger>
            <TabsTrigger value="niveis" className="w-full">Níveis</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6 pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Logo Primário</div>
                  <div className="text-xs text-muted-foreground">
                    Usado no ambiente do parceiro e na tela de login.
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-28 overflow-hidden rounded-md bg-muted grid place-items-center">
                    {logoPrimaryPreview ? (
                      <img src={logoPrimaryPreview} alt="Logo Primário" className="max-h-16 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem logo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      Enviar arquivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], "primary")}
                      />
                    </label>
                    {logoPrimaryPreview ? (
                      <Button variant="destructive" size="sm" onClick={() => removeLogo("primary")}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Logo Negativo</div>
                  <div className="text-xs text-muted-foreground">
                    Usado no ambiente admin (fundos escuros).
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-28 overflow-hidden rounded-md bg-muted grid place-items-center">
                    {logoNegativePreview ? (
                      <img src={logoNegativePreview} alt="Logo Negativo" className="max-h-16 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem logo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      Enviar arquivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], "negative")}
                      />
                    </label>
                    {logoNegativePreview ? (
                      <Button variant="destructive" size="sm" onClick={() => removeLogo("negative")}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Plataforma</label>
                <Input
                  value={settings.platformName}
                  onChange={(e) => setSettings((s) => (s ? { ...s, platformName: e.target.value } : null))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={settings.description ?? ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, description: e.target.value } : null))}
                  rows={3}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp de Suporte</label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={settings.supportWhatsapp ?? ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, supportWhatsapp: formatPhoneBR(e.target.value) } : null))}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail de Suporte</label>
                <Input
                  type="email"
                  placeholder="ex.: comercial@validanr1.com.br"
                  value={settings.leadsNotifyEmail ?? ""}
                  onChange={(e) => setSettings((s) => (s ? { ...s, leadsNotifyEmail: e.target.value } : null))}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Seção de toggles removida conforme solicitado */}

            <div className="pt-2">
              <Button onClick={onSaveGeneral} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="pt-4">
            {/* Sub-aba interna para separar Perfis de Gestão de Usuários */}
            <Tabs defaultValue="perfis">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="perfis" className="w-full">Perfis de Acesso</TabsTrigger>
                <TabsTrigger value="gestao" className="w-full">Gestão de Usuários</TabsTrigger>
              </TabsList>

              <TabsContent value="perfis" className="pt-4">
                <AccessProfiles />
              </TabsContent>

              <TabsContent value="gestao" className="pt-4">
                <UserManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="emails" className="pt-4 space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">E-mails Transacionais (Resend)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure os templates de e-mails transacionais (boas-vindas, suspensão, ativação, etc.) enviados via Resend.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ E-mails de autenticação (confirmação de cadastro, reset de senha) são gerenciados pelo Supabase Auth no dashboard.
                </p>
              </div>

              <EmailTemplates />
            </div>
          </TabsContent>

          <TabsContent value="questionarios" className="pt-4">
            <Questionnaires />
          </TabsContent>

          <TabsContent value="integracoes" className="pt-4 space-y-6">
            <Tabs defaultValue="resend">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="resend">Resend</TabsTrigger>
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
              </TabsList>

              <TabsContent value="resend" className="pt-4">
                <Card className="p-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">Configuração de E-mail (Resend)</div>
                      <div className="text-xs text-muted-foreground">
                        Chave de API para o serviço de envio de e-mails transacionais via Resend.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">RESEND_API_KEY</label>
                      <Input
                        type="password"
                        placeholder="sk_resend_..."
                        value={settings.resendApiKey ?? ""}
                        onChange={(e) => setSettings((s) => (s ? { ...s, resendApiKey: e.target.value } : null))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="pt-2">
                      <Button onClick={onSaveGeneral} disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar Configuração Resend"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="smtp" className="pt-4">
                <Card className="p-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">Configuração de E-mail (SMTP)</div>
                      <div className="text-xs text-muted-foreground">
                        Configurações para envio de e-mails transacionais via servidor SMTP próprio.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Endereço de E-mail Remetente</label>
                      <Input
                        type="email"
                        placeholder="noreply@seusite.com"
                        value={settings.emailFromAddress}
                        onChange={(e) => setSettings((s) => (s ? { ...s, emailFromAddress: e.target.value } : null))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Host SMTP</label>
                        <Input
                          placeholder="smtp.seusite.com"
                          value={settings.smtpHost ?? ""}
                          onChange={(e) => setSettings((s) => (s ? { ...s, smtpHost: e.target.value } : null))}
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Porta SMTP</label>
                        <Input
                          type="number"
                          placeholder="587"
                          value={settings.smtpPort ?? ""}
                          onChange={(e) => setSettings((s) => (s ? { ...s, smtpPort: Number(e.target.value) || undefined } : null))}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Usuário SMTP</label>
                        <Input
                          placeholder="usuario@seusite.com"
                          value={settings.smtpUsername ?? ""}
                          onChange={(e) => setSettings((s) => (s ? { ...s, smtpUsername: e.target.value } : null))}
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Senha SMTP</label>
                        <Input
                          type="password"
                          placeholder="Sua senha SMTP"
                          value={settings.smtpPassword ?? ""}
                          onChange={(e) => setSettings((s) => (s ? { ...s, smtpPassword: e.target.value } : null))}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Criptografia SMTP</label>
                      <Select
                        value={settings.smtpEncryption ?? "tls"}
                        onValueChange={(v: "none" | "tls" | "ssl") => setSettings((s) => (s ? { ...s, smtpEncryption: v } : null))}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Selecione o tipo de criptografia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="none">Nenhuma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2">
                      <Button onClick={onSaveGeneral} disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar Configuração SMTP"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
            {/* Novo campo de seleção para emailProvider */}
            <Card className="p-6">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Provedor de E-mail Principal</div>
                  <div className="text-xs text-muted-foreground">
                    Selecione qual serviço será usado para enviar e-mails transacionais.
                  </div>
                </div>
                <Select
                  value={settings.emailProvider}
                  onValueChange={(v: "resend" | "smtp") => setSettings((s) => (s ? { ...s, emailProvider: v } : null))}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="smtp">SMTP Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="pt-2">
                  <Button onClick={onSaveGeneral} disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar Provedor de E-mail"}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tipos-avaliacao" className="pt-4">
            <SimpleManager
              title="Tipos de Avaliação"
              collectionKey="assessment_types"
              createLabel="Novo Tipo"
              nameLabel="Nome do Tipo"
              emptyMessage="Nenhum tipo cadastrado."
            />
          </TabsContent>

          <TabsContent value="graus-risco" className="pt-4">
            <SimpleManager
              title="Graus de Risco"
              collectionKey="risk_grades"
              createLabel="Novo Grau"
              nameLabel="Nome do Grau"
              emptyMessage="Nenhum grau cadastrado."
            />
          </TabsContent>

          <TabsContent value="niveis" className="pt-4">
            <SimpleManager
              title="Níveis"
              collectionKey="levels"
              createLabel="Novo Nível"
              nameLabel="Nome do Nível"
              emptyMessage="Nenhum nível cadastrado."
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;