alter table public.tasks_wagner
  add column if not exists acknowledged boolean not null default false;

create index if not exists tasks_wagner_ack_idx on public.tasks_wagner(acknowledged);