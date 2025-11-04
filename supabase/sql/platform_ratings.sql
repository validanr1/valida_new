-- Platform ratings schema and policies
-- Run this in Supabase SQL editor

-- Ensure extension for gen_random_uuid
create extension if not exists pgcrypto with schema public;

-- Table
create table if not exists public.platform_ratings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  user_id uuid not null,
  score int not null check (score between 1 and 5),
  comment text null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_platform_ratings_partner_created on public.platform_ratings (partner_id, created_at desc);
create index if not exists idx_platform_ratings_user on public.platform_ratings (user_id);

-- Enable RLS
alter table public.platform_ratings enable row level security;

-- Policies
-- 1) Allow users to see ratings of partners they belong to, or their own ratings
create policy if not exists platform_ratings_select
on public.platform_ratings
for select
using (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or exists (
    select 1 from public.partner_members pm
    where pm.user_id = auth.uid()
      and pm.partner_id = platform_ratings.partner_id
  )
);

-- 2) Allow authenticated users to insert their own rating (user_id must match token)
create policy if not exists platform_ratings_insert
on public.platform_ratings
for insert
with check (
  auth.role() = 'service_role'
  or user_id = auth.uid()
);

-- 3) Allow owner to update/delete their own rating, and SuperAdmins via RPC
create policy if not exists platform_ratings_update
on public.platform_ratings
for update
using (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or coalesce((select is_super_admin_by_id(auth.uid())), false)
)
with check (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or coalesce((select is_super_admin_by_id(auth.uid())), false)
);

create policy if not exists platform_ratings_delete
on public.platform_ratings
for delete
using (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or coalesce((select is_super_admin_by_id(auth.uid())), false)
);

-- Optional: minimal seed
-- insert into public.platform_ratings (partner_id, user_id, score, comment) values
--   ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 5, 'Ótima plataforma!')
-- on conflict do nothing;
