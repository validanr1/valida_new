import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSettings, saveSettings, type PlatformSettings } from "@/services/settings";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AccessProfiles from "@/components/admin/settings/AccessProfiles";
import Questionnaires from "@/components/admin/settings/Questionnaires";
import SimpleManager from "@/components/admin/settings/SimpleManager";
import EmailTemplates from "@/components/admin/settings/EmailTemplates";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserManagement from "@/pages/admin/UserManagement";
import {
  Settings as SettingsIcon,
  Users,
  Mail,
  ClipboardList,
  Network,
  FileText,
  AlertTriangle,
  Layers,
  Scale
} from "lucide-react";

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
  const [termsHtml, setTermsHtml] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [cookiesHtml, setCookiesHtml] = useState("");
  const [lgpdHtml, setLgpdHtml] = useState("");
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalSaving, setLegalSaving] = useState(false);

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
    (async () => {
      setLegalLoading(true);
      try {
        const b = supabase.storage.from("legal");
        const dTerms = await b.download("terms.html");
        if (!dTerms.error && dTerms.data) setTermsHtml(await dTerms.data.text());
        const dPrivacy = await b.download("privacy.html");
        if (!dPrivacy.error && dPrivacy.data) setPrivacyHtml(await dPrivacy.data.text());
        const dCookies = await b.download("cookies.html");
        if (!dCookies.error && dCookies.data) setCookiesHtml(await dCookies.data.text());
        const dLgpd = await b.download("lgpd.html");
        if (!dLgpd.error && dLgpd.data) setLgpdHtml(await dLgpd.data.text());
      } catch (_) {
      } finally {
        setLegalLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [session?.user?.id]);

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
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste preferências da plataforma e módulos administrativos.</p>
      </div>

      <Tabs defaultValue="geral" className="flex flex-col md:flex-row gap-4 md:gap-6" orientation="vertical">
        <aside className="w-full md:w-64 shrink-0">
          <Card className="p-2 sticky top-6">
            <TabsList className="flex flex-col h-auto w-full justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="geral" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <SettingsIcon size={16} /> Geral
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Users size={16} /> Usuários
              </TabsTrigger>
              <TabsTrigger value="emails" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Mail size={16} /> E-mails
              </TabsTrigger>
              <TabsTrigger value="questionarios" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <ClipboardList size={16} /> Questionários
              </TabsTrigger>
              <TabsTrigger value="integracoes" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Network size={16} /> Integrações
              </TabsTrigger>
              <TabsTrigger value="tipos-avaliacao" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <FileText size={16} /> Tipos de Avaliação
              </TabsTrigger>
              <TabsTrigger value="graus-risco" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <AlertTriangle size={16} /> Graus de Risco
              </TabsTrigger>
              <TabsTrigger value="niveis" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Layers size={16} /> Níveis
              </TabsTrigger>
              <TabsTrigger value="juridico" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Scale size={16} /> Jurídico
              </TabsTrigger>
            </TabsList>
          </Card>
        </aside>

        <div className="flex-1 min-w-0">
          <TabsContent value="geral" className="mt-0">
            <Card className="p-4 md:p-6 space-y-6">
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
                    placeholder="ex.: suporte@validanr1.com.br"
                    value={settings.supportEmail ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, supportEmail: e.target.value } : null))}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">E-mail para Notificações (Logins e Cadastros)</label>
                  <Input
                    type="email"
                    placeholder="ex.: admin@validanr1.com.br"
                    value={settings.leadsNotifyEmail ?? ""}
                    onChange={(e) => setSettings((s) => (s ? { ...s, leadsNotifyEmail: e.target.value } : null))}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    E-mail que receberá notificações automáticas de novos logins e cadastros de parceiros.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={onSaveGeneral} disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-0">
            <Card className="p-4">
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
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-0 space-y-6">
            <Card className="p-4 md:p-6">
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
            </Card>
          </TabsContent>

          <TabsContent value="questionarios" className="mt-0">
            <Card className="p-4">
              <Questionnaires />
            </Card>
          </TabsContent>

          <TabsContent value="integracoes" className="mt-0 space-y-6">
            <Tabs defaultValue="resend">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="resend">Resend</TabsTrigger>
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
              </TabsList>

              <TabsContent value="resend" className="pt-4">
                <Card className="p-4 md:p-6">
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
                <Card className="p-4 md:p-6">
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
            <Card className="p-4 md:p-6">
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

          <TabsContent value="tipos-avaliacao" className="mt-0">
            <Card className="p-4">
              <SimpleManager
                title="Tipos de Avaliação"
                collectionKey="assessment_types"
                createLabel="Novo Tipo"
                nameLabel="Nome do Tipo"
                emptyMessage="Nenhum tipo cadastrado."
              />
            </Card>
          </TabsContent>

          <TabsContent value="graus-risco" className="mt-0">
            <Card className="p-4">
              <SimpleManager
                title="Graus de Risco"
                collectionKey="risk_grades"
                createLabel="Novo Grau"
                nameLabel="Nome do Grau"
                emptyMessage="Nenhum grau cadastrado."
              />
            </Card>
          </TabsContent>

          <TabsContent value="niveis" className="mt-0">
            <Card className="p-4">
              <SimpleManager
                title="Níveis"
                collectionKey="levels"
                createLabel="Novo Nível"
                nameLabel="Nome do Nível"
                emptyMessage="Nenhum nível cadastrado."
              />
            </Card>
          </TabsContent>

          <TabsContent value="juridico" className="mt-0 space-y-6">
            <Card className="p-4 md:p-6 space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Termos de Uso (HTML)</div>
                  <Textarea rows={10} value={termsHtml} onChange={(e) => setTermsHtml(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Política de Privacidade (HTML)</div>
                  <Textarea rows={10} value={privacyHtml} onChange={(e) => setPrivacyHtml(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Política de Cookies (HTML)</div>
                  <Textarea rows={10} value={cookiesHtml} onChange={(e) => setCookiesHtml(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">LGPD (Aviso/Política em HTML)</div>
                  <Textarea rows={10} value={lgpdHtml} onChange={(e) => setLgpdHtml(e.target.value)} />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  onClick={async () => {
                    setLegalSaving(true);
                    try {
                      const b = supabase.storage.from("legal");
                      const uploads = [] as Promise<any>[];
                      uploads.push(b.upload("terms.html", new Blob([termsHtml], { type: "text/html" }), { upsert: true }));
                      uploads.push(b.upload("privacy.html", new Blob([privacyHtml], { type: "text/html" }), { upsert: true }));
                      uploads.push(b.upload("cookies.html", new Blob([cookiesHtml], { type: "text/html" }), { upsert: true }));
                      uploads.push(b.upload("lgpd.html", new Blob([lgpdHtml], { type: "text/html" }), { upsert: true }));
                      await Promise.all(uploads);
                      showSuccess("Políticas salvas.");
                    } catch (e) {
                      showError("Falha ao salvar políticas.");
                    } finally {
                      setLegalSaving(false);
                    }
                  }}
                  disabled={legalSaving || legalLoading}
                >
                  {legalSaving ? "Salvando..." : "Salvar Políticas"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;