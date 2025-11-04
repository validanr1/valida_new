-- Create reports table for denunciations
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  department text,
  role text,
  title text,
  description text,
  status text default 'open',
  treated boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for filtering
create index if not exists idx_reports_partner_id on public.reports(partner_id);
create index if not exists idx_reports_company_id on public.reports(company_id);
create index if not exists idx_reports_employee_id on public.reports(employee_id);
create index if not exists idx_reports_created_at on public.reports(created_at desc);

-- Enable RLS
alter table public.reports enable row level security;

-- Allow public (anon) inserts for the external denunciation form.
-- Requirement: partner_id and company_id must be provided.
DROP POLICY IF EXISTS "public can insert denunciations" ON public.reports;
create policy "public can insert denunciations"
  on public.reports
  for insert
  to anon
  with check (partner_id is not null and company_id is not null and description is not null and length(trim(description)) >= 10);

-- Allow authenticated users to read reports (adjust as needed for stricter rules)
DROP POLICY IF EXISTS "authenticated can select reports" ON public.reports;
create policy "authenticated can select reports"
  on public.reports
  for select
  to authenticated
  using (true);

-- Allow authenticated users to update reports (used in admin UI)
DROP POLICY IF EXISTS "authenticated can update reports" ON public.reports;
create policy "authenticated can update reports"
  on public.reports
  for update
  to authenticated
  using (true)
  with check (true);
