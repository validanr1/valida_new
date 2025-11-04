# Onboarding – Valida NR1

Este guia passo a passo ajuda você a subir o ambiente local, configurar o Supabase e publicar a aplicação sem dores.

## 1) Clonar e instalar
- Clone o repositório
- Instale PNPM: `npm i -g pnpm`
- Rode `pnpm install`

## 2) Variáveis de ambiente
- Copie `.env.example` para `.env`
- Preencha:
  - `VITE_SUPABASE_URL`: `https://<ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY`: sua chave anônima
  - `VITE_SUPABASE_FUNCTIONS_URL`: `https://<ref>.functions.supabase.co` (recomendado)
  - `VITE_DEMO_MODE=false`

## 3) Supabase – projeto
- Crie um projeto no Supabase
- No dashboard, copie `URL` e `anon key` e coloque em `.env`
- Se necessário, configure tabelas e RLS (migrations disponíveis em `supabase/migrations/`)

## 4) Edge Functions
- As funções estão em `supabase/functions/*`
- Defina secrets no Supabase para cada função (ver `supabase/functions/README.md`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - E-mail (para leads/convites): `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `LOGIN_URL`, `LEADS_NOTIFY_EMAIL`, `AUTH_USE_INVITE`
- Via CLI (exemplos):
```
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set EMAIL_PROVIDER=resend EMAIL_API_KEY=... EMAIL_FROM=... LOGIN_URL=https://seuapp.com/login
supabase secrets set LEADS_NOTIFY_EMAIL=contato@seuapp.com AUTH_USE_INVITE=true
```

## 5) Desenvolver localmente
- `pnpm dev` → abre em `http://localhost:8080`
- A aplicação usa polling para HMR (útil em alguns ambientes Windows/WLS)

## 6) Build e preview
- `pnpm build`
- `pnpm preview`

## 7) Deploy (Vercel)
- Crie um projeto no Vercel e conecte o repositório
- Adicione envs do frontend em Vercel:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DEMO_MODE=false`
- Publique. O `vercel.json` já contém rewrite para SPA.

## 8) Testes manuais pós‑deploy
- Login: acesso ao `/login`
- Rotas públicas: `/`, `/avaliacao`, `/denuncia`
- Admin/Parceiro: garanta que roles e permissions estão corretos
- Edge Functions: verifique chamadas (leads, partners, submit‑assessment) e respostas HTTP/CORS

## 9) Problemas comuns
- Fallback incorreto para funções: defina `VITE_SUPABASE_FUNCTIONS_URL`
- 403 RLS: revise policies e claims no JWT (`partner_id`)
- CORS: confirmar headers e origem; funções já incluem CORS básicos

Pronto! Com isso você tem um caminho seguro para desenvolvimento e produção.