-- Create denuncias table (Portuguese naming) for denunciations
create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  setor text,
  cargo text,
  titulo text,
  descricao text,
  status text default 'aberta',
  tratada boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_denuncias_partner_id on public.denuncias(partner_id);
create index if not exists idx_denuncias_company_id on public.denuncias(company_id);
create index if not exists idx_denuncias_created_at on public.denuncias(created_at desc);

-- Enable RLS
alter table public.denuncias enable row level security;

-- Public (anon) can insert denunciations via external form
DROP POLICY IF EXISTS "anon can insert denuncias" ON public.denuncias;
create policy "anon can insert denuncias"
  on public.denuncias
  for insert
  to anon
  with check (
    partner_id is not null and
    company_id is not null and
    descricao is not null and length(trim(descricao)) >= 10
  );

-- Authenticated can read (adjust as needed)
DROP POLICY IF EXISTS "authenticated can select denuncias" ON public.denuncias;
create policy "authenticated can select denuncias"
  on public.denuncias
  for select
  to authenticated
  using (true);

-- Authenticated can update (administrative handling)
DROP POLICY IF EXISTS "authenticated can update denuncias" ON public.denuncias;
create policy "authenticated can update denuncias"
  on public.denuncias
  for update
  to authenticated
  using (true)
  with check (true);
