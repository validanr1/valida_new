-- Create test_trae table
create table if not exists public.test_trae (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster queries
create index if not exists idx_test_trae_created_at on public.test_trae(created_at desc);

-- Enable Row Level Security
alter table public.test_trae enable row level security;

-- Create policies for access control
-- Allow authenticated users to read all records
DROP POLICY IF EXISTS "authenticated can select test_trae" ON public.test_trae;
create policy "authenticated can select test_trae"
  on public.test_trae
  for select
  to authenticated
  using (true);

-- Allow authenticated users to insert records
DROP POLICY IF EXISTS "authenticated can insert test_trae" ON public.test_trae;
create policy "authenticated can insert test_trae"
  on public.test_trae
  for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update their own records
DROP POLICY IF EXISTS "authenticated can update test_trae" ON public.test_trae;
create policy "authenticated can update test_trae"
  on public.test_trae
  for update
  to authenticated
  using (true)
  with check (true);

-- Create trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger test_trae_updated_at
  before update on public.test_trae
  for each row
  execute procedure public.handle_updated_at();

-- Comment on table and columns for better documentation
comment on table public.test_trae is 'Tabela de teste criada via Trae AI';
comment on column public.test_trae.id is 'ID único da entrada';
comment on column public.test_trae.name is 'Nome do item de teste';
comment on column public.test_trae.description is 'Descrição detalhada do item';
comment on column public.test_trae.status is 'Status atual do item (active, inactive, etc)';
comment on column public.test_trae.created_at is 'Data de criação do registro';
comment on column public.test_trae.updated_at is 'Data da última atualização do registro';