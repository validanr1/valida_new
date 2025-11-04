# Edge Function: send-email

Função para envio de e-mails transacionais via Resend.

## Configuração de Secrets

Execute no Supabase Dashboard ou via CLI:

```bash
# API Key da Resend
supabase secrets set RESEND_API_KEY=re_sua_chave_aqui

# E-mail remetente (deve estar verificado no Resend)
supabase secrets set RESEND_FROM_EMAIL=noreply@seudominio.com
```

## Templates Disponíveis

### 1. send_welcome
E-mail de boas-vindas ao criar parceiro.

**Payload:**
```json
{
  "action": "send_welcome",
  "recipient_email": "parceiro@example.com",
  "data": {
    "first_name": "João",
    "partner_name": "Consultoria Alpha",
    "platform_name": "Valida NR1",
    "activation_link": "https://app.com/partner/ativacao",
    "temp_password": "xyz123"
  }
}
```

### 2. send_activation_complete
Confirmação de ativação concluída.

**Payload:**
```json
{
  "action": "send_activation_complete",
  "recipient_email": "parceiro@example.com",
  "data": {
    "first_name": "João",
    "partner_name": "Consultoria Alpha",
    "dashboard_link": "https://app.com/partner/painel"
  }
}
```

### 3. send_suspension
Notificação de suspensão de conta.

**Payload:**
```json
{
  "action": "send_suspension",
  "recipient_email": "parceiro@example.com",
  "data": {
    "first_name": "João",
    "partner_name": "Consultoria Alpha",
    "reason": "Inadimplência",
    "support_whatsapp": "+5511999999999"
  }
}
```

### 4. send_reactivation
Notificação de reativação de conta.

**Payload:**
```json
{
  "action": "send_reactivation",
  "recipient_email": "parceiro@example.com",
  "data": {
    "first_name": "João",
    "partner_name": "Consultoria Alpha",
    "dashboard_link": "https://app.com/partner/painel"
  }
}
```

## Deploy

```bash
supabase functions deploy send-email
```

## Teste Local

```bash
supabase functions serve send-email
```

Depois, faça uma requisição POST:

```bash
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "action": "send_welcome",
    "recipient_email": "teste@example.com",
    "data": {
      "first_name": "Teste",
      "partner_name": "Empresa Teste",
      "activation_link": "https://app.com/partner/ativacao",
      "temp_password": "teste123"
    }
  }'
```

## Logs

Todos os e-mails enviados (sucesso ou falha) são registrados na tabela `email_logs`.

Consultar logs:
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```
