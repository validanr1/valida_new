# 📧 Templates de Email - Valida NR1

## 📋 Visão Geral

Este diretório contém todos os templates de email transacionais da plataforma Valida NR1. Os templates foram criados com design moderno, responsivo e seguindo as cores e identidade visual do projeto.

## 🎨 Templates Disponíveis

### 1️⃣ Boas-vindas (welcome)
- **Arquivo:** `01-welcome.html`
- **Assunto:** `🎉 Bem-vindo à {{platform_name}}, {{first_name}}!`
- **Quando usar:** Enviado quando um novo parceiro é cadastrado na plataforma
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{last_name}}` - Sobrenome do usuário
  - `{{partner_name}}` - Nome da empresa parceira
  - `{{platform_name}}` - Nome da plataforma (Valida NR1)
  - `{{recipient_email}}` - Email do destinatário
  - `{{temp_password}}` - Senha temporária (opcional)
  - `{{activation_link}}` - Link para ativação da conta
  - `{{theme_primary}}` - Cor primária do tema (#667eea padrão)
  - `{{theme_secondary}}` - Cor secundária do tema (#764ba2 padrão)
  - `{{logo_url}}` - URL do logo da plataforma

### 2️⃣ Ativação Concluída (activation_complete)
- **Arquivo:** `02-activation-complete.html`
- **Assunto:** `✅ Conta Ativada - Bem-vindo à {{platform_name}}!`
- **Quando usar:** Enviado quando o parceiro completa o processo de ativação
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{platform_name}}` - Nome da plataforma
  - `{{dashboard_link}}` - Link para o dashboard
  - `{{logo_url}}` - URL do logo

### 3️⃣ Suspensão (suspension)
- **Arquivo:** `03-suspension.html`
- **Assunto:** `⚠️ Conta Temporariamente Suspensa - {{partner_name}}`
- **Quando usar:** Enviado quando uma conta é suspensa temporariamente
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{partner_name}}` - Nome da empresa parceira
  - `{{platform_name}}` - Nome da plataforma
  - `{{reason}}` - Motivo da suspensão
  - `{{support_whatsapp}}` - Número do WhatsApp de suporte
  - `{{logo_url}}` - URL do logo

### 4️⃣ Reativação (reactivation)
- **Arquivo:** `04-reactivation.html`
- **Assunto:** `✅ Conta Reativada - Acesso Liberado - {{partner_name}}`
- **Quando usar:** Enviado quando uma conta suspensa é reativada
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{partner_name}}` - Nome da empresa parceira
  - `{{platform_name}}` - Nome da plataforma
  - `{{dashboard_link}}` - Link para o dashboard
  - `{{logo_url}}` - URL do logo

### 5️⃣ Inativação (inactivation)
- **Arquivo:** `05-inactivation.html`
- **Assunto:** `❌ Conta Inativada`
- **Quando usar:** Enviado quando uma conta é inativada permanentemente
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{partner_name}}` - Nome da empresa parceira
  - `{{platform_name}}` - Nome da plataforma
  - `{{reason}}` - Motivo da inativação
  - `{{support_whatsapp}}` - Número do WhatsApp de suporte
  - `{{logo_url}}` - URL do logo

### 6️⃣ Lembrete (reminder)
- **Arquivo:** `06-reminder.html`
- **Assunto:** `🔔 Lembrete Importante - {{platform_name}}`
- **Quando usar:** Enviado para lembretes gerais aos parceiros
- **Variáveis:**
  - `{{first_name}}` - Primeiro nome do usuário
  - `{{platform_name}}` - Nome da plataforma
  - `{{reason}}` - Mensagem do lembrete
  - `{{dashboard_link}}` - Link para o dashboard
  - `{{logo_url}}` - URL do logo

## 🚀 Como Usar

### Passo 1: Copiar o HTML
1. Abra o arquivo HTML do template desejado
2. Copie todo o conteúdo HTML

### Passo 2: Configurar no Painel Admin
1. Acesse o painel administrativo da plataforma
2. Vá em **Configurações** → **Templates de Email**
3. Selecione a aba do template que deseja configurar
4. Cole o HTML no campo "Conteúdo HTML"
5. Configure o assunto do email
6. Clique em **Salvar Template**

### Passo 3: Testar
1. Use o botão **Preview** para visualizar o email
2. Envie um email de teste para verificar o resultado final

## 🎨 Personalização

### Cores
Os templates usam variáveis para cores que podem ser personalizadas:
- `{{theme_primary}}` - Cor primária (padrão: #667eea)
- `{{theme_secondary}}` - Cor secundária (padrão: #764ba2)

Essas cores são aplicadas em:
- Gradientes do cabeçalho
- Botões de ação
- Destaques e bordas

### Logo
Para adicionar o logo da empresa:
- Configure a variável `{{logo_url}}` com a URL pública do logo
- O logo aparecerá no cabeçalho de todos os emails
- Recomendado: PNG ou SVG com fundo transparente, 180px de largura

## 🔧 Variáveis Condicionais

Alguns templates usam condicionais para exibir conteúdo opcional:

```html
{{#if logo_url}}
  <img src="{{logo_url}}" alt="Logo" />
{{/if}}
```

Isso significa que o conteúdo só será exibido se a variável existir.

## 📱 Responsividade

Todos os templates são responsivos e funcionam bem em:
- 📧 Clientes de email desktop (Outlook, Gmail, etc.)
- 📱 Aplicativos mobile (iOS Mail, Gmail App, etc.)
- 🌐 Webmail (Gmail, Outlook.com, etc.)

## ⚠️ Notas Importantes

1. **Variáveis obrigatórias:** Sempre forneça as variáveis principais como `first_name`, `platform_name`, etc.
2. **Links:** Certifique-se de que os links (`activation_link`, `dashboard_link`) sejam URLs completas e válidas
3. **Testes:** Sempre teste os emails antes de usar em produção
4. **Spam:** Evite palavras que possam ser marcadas como spam (grátis, urgente, etc.)

## 🐛 Solução de Problemas

### Variáveis não substituídas
Se você ver `{{variavel}}` no email enviado:
- Verifique se a variável está sendo passada corretamente no backend
- Confirme o nome exato da variável (case-sensitive)

### Estilos não aplicados
Alguns clientes de email removem CSS:
- Os templates usam inline styles para máxima compatibilidade
- Teste em diferentes clientes de email

### Imagens não aparecem
- Verifique se a URL do logo está acessível publicamente
- Alguns clientes bloqueiam imagens por padrão

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@validanr1.com.br
- 📱 WhatsApp: (consulte seu contato)

---

**Última atualização:** Novembro 2024
**Versão:** 1.0.0
