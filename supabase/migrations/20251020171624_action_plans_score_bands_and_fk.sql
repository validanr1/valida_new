-- Migration: action_plans score bands and FK to question_categories
-- Description: Adds title/score_min/score_max to public.action_plans and adjusts FK for category_id

begin;

-- 1) Columns used by new UI
alter table public.action_plans
  add column if not exists title text,
  add column if not exists score_min numeric,
  add column if not exists score_max numeric;

-- 1.1) Initialize default bands if missing
update public.action_plans
set score_min = coalesce(score_min, 0),
    score_max = coalesce(score_max, 74.99)
where score_min is null or score_max is null;

-- 1.2) Migrate legacy categories (action_plan_categories) to question_categories by name
--     Create missing question_categories for any legacy names referenced by action_plans
--     Then rewrite action_plans.category_id to the corresponding question_categories.id
do $$
begin
  -- Create any missing question_categories (by case-insensitive name match)
  insert into public.question_categories (name)
  select distinct apc.name
  from public.action_plans ap
  join public.action_plan_categories apc on apc.id = ap.category_id
  left join public.question_categories qc on lower(qc.name) = lower(apc.name)
  where ap.category_id is not null
    and qc.id is null;

  -- Update action_plans.category_id to point at question_categories
  update public.action_plans ap
  set category_id = qc.id
  from public.action_plan_categories apc
  join public.question_categories qc on lower(qc.name) = lower(apc.name)
  where ap.category_id = apc.id
    and ap.category_id is not null;
end $$;

-- 2) Ensure FK points to question_categories, not legacy categories
do $$
begin
  -- Drop existing FK if present (name may vary across environments)
  begin
    alter table public.action_plans drop constraint if exists action_plans_category_id_fkey;
  exception when others then
    null;
  end;

  -- Create (or replace) the intended FK
  alter table public.action_plans
    add constraint action_plans_category_id_fkey
      foreign key (category_id)
      references public.question_categories(id)
      on delete set null;
end $$;

commit;

