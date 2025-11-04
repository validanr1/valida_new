# Valida NR1 – Onboarding e Configuração

Este projeto é uma aplicação web em React + Vite, com autenticação e dados via Supabase e UI baseada em Tailwind/Shadcn. Abaixo está um guia completo para você subir o ambiente, configurar variáveis de ambiente e entender como rodar, buildar e publicar a plataforma com segurança.

## Sumário
- Visão geral do stack
- Pré‑requisitos
- Instalação e execução (dev/build/preview)
- Variáveis de ambiente (frontend)
- Modo Demo
- Supabase (projeto, Edge Functions e secrets)
- Deploy (Vercel)
- Dicas e solução de problemas

## Visão geral do stack
- Frontend: React + TypeScript, `react-router-dom`, `@tanstack/react-query`, Tailwind + Shadcn UI.
- Backend (BaaS): Supabase (`@supabase/supabase-js`), PostgREST, Row-Level Security, Edge Functions (Deno).
- Build: Vite (porta padrão 8080, polling para HMR).
- Deploy: Vercel (SPA rewrite para `index.html`).

## Pré‑requisitos
- Node.js 18+ e PNPM (`npm i -g pnpm`).
- Conta no Supabase e um projeto criado.
- Conta no Vercel (opcional, para deploy).

## Instalação e execução
1. Instale dependências:
   - `pnpm install`
2. Crie seu arquivo de ambiente a partir do exemplo:
   - Copie `.env.example` para `.env` e preencha valores.
3. Rode em desenvolvimento:
   - `pnpm dev`
   - Acesse `http://localhost:8080/`
4. Build de produção:
   - `pnpm build`
5. Preview do build local:
   - `pnpm preview`

## Variáveis de ambiente (frontend)
Use um arquivo `.env` (ou `.env.local`) na raiz. Vite carrega automaticamente variáveis que começam com `VITE_`.

Obrigatórias (para usar Supabase):
- `VITE_SUPABASE_URL`: URL do projeto Supabase (ex.: `https://<ref>.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: chave Anônima do projeto.

Altamente recomendada (para chamadas às Edge Functions):
- `VITE_SUPABASE_FUNCTIONS_URL`: base de funções do Supabase (ex.: `https://<ref>.functions.supabase.co`).
  - Observação: se esta variável não estiver definida, alguns serviços usam um fallback para `.../functions/v1` no domínio principal, que pode não funcionar nos projetos hospedados. Defina esta variável para evitar erros.

Opcional:
- `VITE_DEMO_MODE`: `true`/`false`. Com `true` (ou sem envs do Supabase), a plataforma roda em modo de demonstração, com sessão mockada e sem chamadas reais ao backend.

Exemplo em `.env.example` (já incluso no repo):
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT_REF.functions.supabase.co
VITE_DEMO_MODE=false
```

## Modo Demo
Se `VITE_DEMO_MODE=true` ou se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estiverem ausentes, a aplicação entra em modo demo automaticamente. Isso permite navegar na UI sem backend, útil para testes e apresentação. Em produção, mantenha `VITE_DEMO_MODE=false` e configure as variáveis corretamente.

## Supabase (projeto, Edge Functions e secrets)
1. Crie um projeto no Supabase e obtenha:
   - `SUPABASE_URL` (mostrado no dashboard)
   - `SUPABASE_ANON_KEY` (API Key Anônima)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role – usado apenas em funções que exigem privilégios administrativos)
2. Configure o frontend (`.env`) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Edge Functions: este repo inclui várias funções em `supabase/functions/*`. Para funcionar em produção, você precisa definir secrets adequados para cada função no Supabase. Exemplos de variáveis:
   - Comuns às funções administrativas:
     - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (acesso privilegiado)
   - E-mail/convites (ex.: `admin-leads`, `admin-partners`):
     - `EMAIL_PROVIDER` (ex.: `resend` ou `smtp`)
     - `EMAIL_API_KEY`
     - `EMAIL_FROM`
     - `LOGIN_URL` (URL da página de login pública)
     - `LEADS_NOTIFY_EMAIL` (opcional, para notificação de novos leads)
     - `AUTH_USE_INVITE` (`true`/`false` – controla fluxo de convite)
   - Consulte `supabase/functions/README.md` para uma lista por função e instruções.

Você pode definir secrets via CLI:
```
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set EMAIL_PROVIDER=resend EMAIL_API_KEY=... EMAIL_FROM=... LOGIN_URL=https://seuapp.com/login
supabase secrets set LEADS_NOTIFY_EMAIL=contato@seuapp.com AUTH_USE_INVITE=true
```
Ou via Dashboard do Supabase (Project Settings → Functions → Secrets).

## Deploy (Vercel)
1. Crie um projeto no Vercel e conecte este repositório.
2. Configure as environment variables do frontend no Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_FUNCTIONS_URL` (recomendado)
   - `VITE_DEMO_MODE=false`
3. O arquivo `vercel.json` já contém um rewrite para SPA.
4. Publique. Verifique a tela de login e páginas públicas. Rotas protegidas exigem Supabase configurado e roles/permissions corretos.

## Dicas e solução de problemas
- Erro: “Missing VITE_SUPABASE_FUNCTIONS_URL…”. Defina `VITE_SUPABASE_FUNCTIONS_URL` com `https://<ref>.functions.supabase.co` para chamadas a funções.
- Sessão não carrega: verifique se o usuário está logado e se as tabelas (`profiles`, `role_profiles`, `partner_members`) têm dados consistentes.
- 403/401 em chamadas: normalmente é RLS. Cheque policies e claims (ex.: `partner_id` no JWT quando necessário).
- CORS em Edge Functions: funções deste repo já adicionam cabeçalhos CORS; valide que o domínio do app está correto.
- Build/preview OK, mas 404 no deploy: `vercel.json` corrige rewrites; confira DNS e caminhos.

## Recursos adicionais
- Guia passo a passo: `docs/ONBOARDING.md` (inclui checklist rápido de configuração).
- Funções e seus secrets: `supabase/functions/README.md`.

## Comandos úteis
- `pnpm dev` - Inicia servidor de desenvolvimento na porta 8080
- `pnpm build` - Cria build de produção
- `pnpm preview` - Preview do build local
- `pnpm lint` - Executa linter no código

Com isso, você terá um onboarding claro, variáveis de ambiente documentadas e um caminho seguro para desenvolvimento e produção, minimizando riscos de erro.