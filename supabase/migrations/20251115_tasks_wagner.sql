-- Developer tasks (tasks_wagner)
create table if not exists public.tasks_wagner (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  order_index integer not null default 0,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_wagner_status_idx on public.tasks_wagner(status);
create index if not exists tasks_wagner_priority_idx on public.tasks_wagner(priority);
create index if not exists tasks_wagner_created_idx on public.tasks_wagner(created_at);

create or replace function public.update_tasks_wagner_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_tasks_wagner_updated_at on public.tasks_wagner;
create trigger trg_tasks_wagner_updated_at
before update on public.tasks_wagner
for each row execute function public.update_tasks_wagner_updated_at();

alter table public.tasks_wagner enable row level security;

-- RLS: allow only specific email or admins (UI will also gate access)
drop policy if exists tasks_wagner_select on public.tasks_wagner;
create policy tasks_wagner_select on public.tasks_wagner
for select to authenticated using (
  coalesce(auth.jwt() ->> 'email','') = 'wfss1982@gmail.com'
);

drop policy if exists tasks_wagner_modify on public.tasks_wagner;
create policy tasks_wagner_modify on public.tasks_wagner
for all to authenticated using (
  coalesce(auth.jwt() ->> 'email','') = 'wfss1982@gmail.com'
) with check (
  coalesce(auth.jwt() ->> 'email','') = 'wfss1982@gmail.com'
);