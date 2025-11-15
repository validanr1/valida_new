-- Legal module tables and policies
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('termos','privacidade','cookies','sla')),
  versao integer not null,
  conteudo_html text not null,
  data_publicacao timestamptz not null default now(),
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;

create unique index if not exists legal_documents_tipo_versao_unique on public.legal_documents(tipo, versao);
create index if not exists legal_documents_tipo_ativo_idx on public.legal_documents(tipo, ativo);

create or replace function public.set_legal_documents_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_legal_documents_updated_at on public.legal_documents;
create trigger trg_legal_documents_updated_at
before update on public.legal_documents
for each row execute function public.set_legal_documents_updated_at();

-- Policies: allow public read of active documents; authenticated full access
drop policy if exists legal_docs_public_read on public.legal_documents;
create policy legal_docs_public_read on public.legal_documents
for select using (ativo = true);

drop policy if exists legal_docs_authenticated_write on public.legal_documents;
create policy legal_docs_authenticated_write on public.legal_documents
for all to authenticated using (true) with check (true);

-- User acceptance registry
create table if not exists public.user_legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  documento_tipo text not null check (documento_tipo in ('termos','privacidade','cookies','sla')),
  versao integer not null,
  data_hora timestamptz not null default now(),
  ip_address text,
  user_agent text
);

alter table public.user_legal_acceptance enable row level security;
create index if not exists user_legal_acceptance_user_idx on public.user_legal_acceptance(user_id);
create index if not exists user_legal_acceptance_tipo_versao_idx on public.user_legal_acceptance(documento_tipo, versao);

drop policy if exists user_legal_acceptance_self_select on public.user_legal_acceptance;
create policy user_legal_acceptance_self_select on public.user_legal_acceptance
for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_legal_acceptance_self_insert on public.user_legal_acceptance;
create policy user_legal_acceptance_self_insert on public.user_legal_acceptance
for insert to authenticated with check (auth.uid() = user_id);

-- LGPD requests
create table if not exists public.lgpd_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo text not null check (tipo in ('exclusao','correcao','portabilidade')),
  status text not null default 'aberto',
  data_criacao timestamptz not null default now(),
  data_resolucao timestamptz
);

alter table public.lgpd_requests enable row level security;
create index if not exists lgpd_requests_user_idx on public.lgpd_requests(user_id);

drop policy if exists lgpd_requests_self_select on public.lgpd_requests;
create policy lgpd_requests_self_select on public.lgpd_requests
for select to authenticated using (auth.uid() = user_id);

drop policy if exists lgpd_requests_self_insert on public.lgpd_requests;
create policy lgpd_requests_self_insert on public.lgpd_requests
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists lgpd_requests_admin_update on public.lgpd_requests;
create policy lgpd_requests_admin_update on public.lgpd_requests
for update to authenticated using (true) with check (true);

-- Cookie consent
create table if not exists public.cookie_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  essenciais boolean not null default true,
  analiticos boolean not null default false,
  marketing boolean not null default false,
  data_hora timestamptz not null default now()
);

alter table public.cookie_consent enable row level security;
create unique index if not exists cookie_consent_user_unique on public.cookie_consent(user_id);

drop policy if exists cookie_consent_self_select on public.cookie_consent;
create policy cookie_consent_self_select on public.cookie_consent
for select to authenticated using (auth.uid() = user_id);

drop policy if exists cookie_consent_self_upsert on public.cookie_consent;
create policy cookie_consent_self_upsert on public.cookie_consent
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists cookie_consent_self_update on public.cookie_consent;
create policy cookie_consent_self_update on public.cookie_consent
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Extend platform_settings for DPO and cookie banner
alter table public.platform_settings
  add column if not exists dpo_name text,
  add column if not exists dpo_email text,
  add column if not exists dpo_phone text,
  add column if not exists cookie_banner_enabled boolean default false,
  add column if not exists cookie_banner_text text;