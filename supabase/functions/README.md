# Edge Functions – Guia rápido

Este documento descreve como configurar e publicar as Edge Functions usadas pela plataforma.

## Estrutura
- `catalogs/`
- `form-status/`
- `submit-assessment/`
- `admin-partners/`
- `admin-leads/`
- `create-partner/`
- `create-super-admin/`
- `update-company-count/`
- `user-management/`

Cada função usa `createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` e requer secrets no ambiente do Supabase.

## Secrets necessários
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço (server-side only)
- `SUPABASE_ANON_KEY`: chave anônima (usada em fluxos autenticados pelo usuário nas functions)
- `SITE_URL`: URL pública do app (usada para links de login/callback em convites)
- E‑mail e convites (quando aplicável):
  - `EMAIL_PROVIDER` (ex.: `resend`)
  - `EMAIL_API_KEY`
  - `EMAIL_FROM`
  - `LOGIN_URL` (link para login usado nos e‑mails)
  - `LEADS_NOTIFY_EMAIL` (notificação de novos leads)
  - `AUTH_USE_INVITE` (`true|false`) – ativa fluxo por convite

## Como definir secrets
Via CLI do Supabase (execute no diretório do projeto):
```
supabase secrets set SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... SITE_URL=https://seuapp.com
supabase secrets set EMAIL_PROVIDER=resend EMAIL_API_KEY=... EMAIL_FROM=noreply@seuapp.com LOGIN_URL=https://seuapp.com/login
supabase secrets set LEADS_NOTIFY_EMAIL=contato@seuapp.com AUTH_USE_INVITE=true
```

## Deploy das funções
```
supabase functions deploy catalogs
supabase functions deploy form-status
supabase functions deploy submit-assessment
supabase functions deploy admin-partners
supabase functions deploy admin-leads
```

## URL base para chamadas
- Recomenda‑se configurar `VITE_SUPABASE_FUNCTIONS_URL` no frontend: `https://<ref>.functions.supabase.co`
- Assim, chamadas do cliente evitam heurísticas/fallbacks.

## Resend – configuração e testes
- Envs obrigatórios quando `EMAIL_PROVIDER=resend`:
  - `EMAIL_API_KEY`: chave secreta do Resend (formato `re_...`)
  - `EMAIL_FROM`: remetente (ex.: `noreply@seuapp.com`)
- Opcional:
  - `LEADS_NOTIFY_EMAIL`: e‑mail para notificação de novos leads
  - `LOGIN_URL`: URL de login usada em e‑mails de acesso
- Testes rápidos:
  - Valide a chave com um `curl` direto (fora das functions):
    ```
    curl -X POST https://api.resend.com/emails \
      -H "Authorization: Bearer $EMAIL_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"from":"'$EMAIL_FROM'","to":["you@domain.com"],"subject":"Teste","html":"<b>ok</b>"}'
    ```
  - Dispare e‑mails pelas funções:
    - `admin-leads`: criar/convertar lead (envia notificação e e‑mail informativo)
    - `admin-partners`: ativar/suspender parceiro (envia e‑mail de acesso/suspensão)
  - Logs de configuração: se `EMAIL_PROVIDER=resend` mas faltar `EMAIL_API_KEY` ou `EMAIL_FROM`, as functions registram `console.warn` e não enviam o e‑mail.

## Dicas de produção
- Não exponha `SERVICE_ROLE_KEY` fora do ambiente das functions
- Monitore logs no Supabase e valide CORS
- Versione alterações e mantenha CI/CD para deploy das functions