import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";

type EmailTemplate = {
  id: string;
  type: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
};

const TEMPLATE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'activation_complete', label: 'Ativação Concluída' },
  { value: 'suspension', label: 'Suspensão' },
  { value: 'reactivation', label: 'Reativação' },
  { value: 'inactivation', label: 'Inativação' },
  { value: 'reminder', label: 'Lembrete' },
];

// Variáveis disponíveis para cada tipo de template
const TEMPLATE_VARIABLES: Record<string, string[]> = {
  welcome: ['first_name', 'last_name', 'partner_name', 'platform_name', 'recipient_email', 'temp_password', 'activation_link', 'theme_primary', 'theme_secondary', 'logo_url', 'support_email', 'support_whatsapp'],
  activation_complete: ['first_name', 'last_name', 'partner_name', 'platform_name', 'dashboard_link', 'theme_primary', 'theme_secondary', 'logo_url', 'support_email', 'support_whatsapp'],
  suspension: ['first_name', 'last_name', 'partner_name', 'platform_name', 'reason', 'support_email', 'support_whatsapp', 'logo_url'],
  reactivation: ['first_name', 'last_name', 'partner_name', 'platform_name', 'dashboard_link', 'logo_url', 'support_email', 'support_whatsapp'],
  inactivation: ['first_name', 'last_name', 'partner_name', 'platform_name', 'reason', 'support_email', 'support_whatsapp', 'logo_url'],
  reminder: ['first_name', 'last_name', 'platform_name', 'reason', 'dashboard_link', 'logo_url', 'support_email', 'support_whatsapp'],
};

const EmailTemplates = () => {
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('email_templates')
        .select('*');

      if (error) throw error;

      const templatesMap: Record<string, EmailTemplate> = {};
      
      // Inicializar templates vazios para todos os tipos com variáveis corretas
      TEMPLATE_TYPES.forEach(type => {
        templatesMap[type.value] = {
          id: crypto.randomUUID(),
          type: type.value,
          subject: '',
          body_html: '',
          variables: TEMPLATE_VARIABLES[type.value] || [],
          is_active: true,
        };
      });
      
      // Sobrescrever com dados do banco se existirem
      data?.forEach((template: any) => {
        templatesMap[template.type] = {
          ...template,
          variables: Array.isArray(template.variables) ? template.variables : [],
        };
      });

      setTemplates(templatesMap);
    } catch (err: any) {
      showError('Erro ao carregar templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (type: string) => {
    const template = templates[type];
    if (!template) {
      showError('Template não encontrado');
      return;
    }

    setSaving(true);
    try {
      console.log('Enviando template:', { type, template });

      // Usar Edge Function dedicada que bypassa schema cache
      const { data, error } = await supabase.functions.invoke('save-email-template', {
        body: {
          type: type, // Usar o parâmetro type em vez de template.type
          subject: template.subject || '',
          body_html: template.body_html || '',
          variables: template.variables || [],
          is_active: template.is_active ?? true,
        }
      });

      console.log('Resposta completa da Edge Function:', JSON.stringify({ data, error }, null, 2));
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Erro da Edge Function:', error);
        console.error('Erro stringified:', JSON.stringify(error, null, 2));
        
        // Tentar extrair mensagem de erro mais detalhada
        let errorMsg = 'Erro desconhecido';
        if (typeof error === 'string') {
          errorMsg = error;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (error.msg) {
          errorMsg = error.msg;
        } else {
          errorMsg = JSON.stringify(error);
        }
        
        throw new Error(`Edge Function error: ${errorMsg}`);
      }
      
      if (data?.error) {
        console.error('Erro retornado nos dados:', data);
        throw new Error(data.error + (data.details ? ` - ${data.details}` : ''));
      }
      
      if (!data?.success) {
        console.warn('Resposta sem sucesso:', data);
        throw new Error('Resposta da função não indica sucesso');
      }

      showSuccess('Template salvo com sucesso!');
      await loadTemplates(); // Recarregar templates
    } catch (err: any) {
      console.error('Erro completo ao salvar:', err);
      showError('Erro ao salvar template: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (type: string, field: keyof EmailTemplate, value: any) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        id: prev[type]?.id || crypto.randomUUID(),
        type: type,
        [field]: value,
      }
    }));
  };

  const generatePreview = (type: string) => {
    const template = templates[type];
    if (!template) return;

    // Dados de exemplo para preview
    const sampleData: Record<string, string> = {
      first_name: 'João',
      last_name: 'Silva',
      partner_name: 'Empresa Exemplo LTDA',
      platform_name: 'Valida NR1',
      recipient_email: 'joao.silva@exemplo.com',
      temp_password: 'Senha123!',
      activation_link: 'https://validanr1.com.br/ativacao',
      theme_primary: '#667eea',
      theme_secondary: '#764ba2',
      logo_url: 'https://via.placeholder.com/150x50/667eea/ffffff?text=Logo',
      reason: 'Pagamento em atraso',
      support_email: 'suporte@validanr1.com.br',
      support_whatsapp: '+55 11 98765-4321',
    };

    // Substituir variáveis no HTML
    let html = template.body_html;
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, sampleData[key]);
    });

    // Processar condicionais simples
    html = html.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return sampleData[variable] ? content : '';
    });

    setPreviewHtml(html);
    setShowPreview(true);
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      showError('Digite um e-mail para enviar o teste');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      showError('Digite um e-mail válido');
      return;
    }

    setSendingTest(true);
    try {
      const template = templates[activeTab];
      
      // Dados de exemplo para o teste
      const sampleData = {
        first_name: 'João',
        last_name: 'Silva',
        partner_name: 'Empresa Exemplo LTDA',
        platform_name: 'Valida NR1',
        recipient_email: testEmail,
        temp_password: 'Senha123!',
        activation_link: 'https://validanr1.com.br/ativacao',
        theme_primary: '#667eea',
        theme_secondary: '#764ba2',
        logo_url: 'https://via.placeholder.com/150x50/667eea/ffffff?text=Logo',
        reason: 'Pagamento em atraso',
        support_email: 'suporte@validanr1.com.br',
        support_whatsapp: '+55 11 98765-4321',
        dashboard_link: 'https://validanr1.com.br/dashboard',
      };
      
      // Mapear tipo de template para action
      const typeToAction: Record<string, string> = {
        'welcome': 'send_welcome',
        'activation_complete': 'send_activation_complete',
        'suspension': 'send_suspension',
        'reactivation': 'send_reactivation',
        'inactivation': 'send_inactivation',
        'reminder': 'send_reminder',
      };
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: typeToAction[activeTab],
          recipient_email: testEmail,
          data: sampleData,
        }
      });

      if (error) throw error;

      showSuccess(`E-mail de teste enviado para ${testEmail}!`);
      setTestEmail('');
    } catch (err: any) {
      console.error('Erro ao enviar e-mail de teste:', err);
      showError('Erro ao enviar e-mail de teste: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATE_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="w-full">
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TEMPLATE_TYPES.map((type) => {
          const template = templates[type.value];
          
          return (
            <TabsContent key={type.value} value={type.value} className="space-y-6 pt-4">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold">
                      E-mail de {type.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure o assunto e conteúdo HTML do e-mail.
                    </p>
                  </div>

                  {template?.variables && template.variables.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2">📋 Variáveis Disponíveis:</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="font-mono text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use estas variáveis no assunto e no HTML para inserir dados dinâmicos.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assunto do E-mail</label>
                    <Input
                      value={template?.subject || ''}
                      onChange={(e) => updateTemplate(type.value, 'subject', e.target.value)}
                      placeholder="Ex: Bem-vindo à {{platform_name}}!"
                      className="h-10 rounded-xl font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variáveis como {`{{first_name}}`} para personalizar o assunto.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Conteúdo HTML</label>
                    <Textarea
                      value={template?.body_html || ''}
                      onChange={(e) => updateTemplate(type.value, 'body_html', e.target.value)}
                      placeholder="Cole o HTML do template aqui..."
                      className="min-h-[400px] font-mono text-xs"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole o código HTML completo do e-mail. Use as variáveis listadas acima.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => saveTemplate(type.value)}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'Salvando...' : 'Salvar Template'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => generatePreview(type.value)}
                    >
                      👁️ Preview
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Dialog de Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do E-mail</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview do email */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[600px] bg-white rounded border"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Enviar email de teste */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-3">📧 Enviar E-mail de Teste</h4>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="seu-email@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTestEmail()}
                  className="flex-1"
                  disabled={sendingTest}
                />
                <Button 
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? 'Enviando...' : '✉️ Enviar Teste'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                O e-mail será enviado com os dados de exemplo mostrados no preview.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;
