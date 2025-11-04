-- Seed default partner role profiles (PartnerAdmin, PartnerManager, PartnerViewer)
-- Safe/Idempotent: updates if exists, inserts if missing.

begin;

-- Ensure extension for gen_random_uuid (if ids use this default)
create extension if not exists pgcrypto with schema public;

-- Helper: upsert by name+target
do $$
declare
  exists_admin boolean;
begin
  -- PartnerAdmin: full access to partner modules
  select exists(
    select 1 from public.role_profiles rp where rp.name = 'PartnerAdmin' and rp.target = 'partner'
  ) into exists_admin;
  if exists_admin then
    update public.role_profiles
      set permissions = array[
        'partner:dashboard:view',
        'partner:companies:read','partner:companies:create','partner:companies:update','partner:companies:delete',
        'partner:departments:read','partner:departments:create','partner:departments:update','partner:departments:delete',
        'partner:roles:read','partner:roles:create','partner:roles:update','partner:roles:delete',
        'partner:employees:read','partner:employees:create','partner:employees:update','partner:employees:delete',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view',
        'partner:profile:manage','partner:settings:manage'
      ],
          status = 'active'
    where name = 'PartnerAdmin' and target = 'partner';
  else
    insert into public.role_profiles (name, target, permissions, status)
    values (
      'PartnerAdmin', 'partner', array[
        'partner:dashboard:view',
        'partner:companies:read','partner:companies:create','partner:companies:update','partner:companies:delete',
        'partner:departments:read','partner:departments:create','partner:departments:update','partner:departments:delete',
        'partner:roles:read','partner:roles:create','partner:roles:update','partner:roles:delete',
        'partner:employees:read','partner:employees:create','partner:employees:update','partner:employees:delete',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view',
        'partner:profile:manage','partner:settings:manage'
      ], 'active'
    );
  end if;
end $$;

do $$
declare
  exists_manager boolean;
begin
  -- PartnerManager: manage without delete
  select exists(
    select 1 from public.role_profiles rp where rp.name = 'PartnerManager' and rp.target = 'partner'
  ) into exists_manager;
  if exists_manager then
    update public.role_profiles
      set permissions = array[
        'partner:dashboard:view',
        'partner:companies:read','partner:companies:create','partner:companies:update',
        'partner:departments:read','partner:departments:create','partner:departments:update',
        'partner:roles:read','partner:roles:create','partner:roles:update',
        'partner:employees:read','partner:employees:create','partner:employees:update',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view',
        'partner:profile:manage','partner:settings:manage'
      ],
          status = 'active'
    where name = 'PartnerManager' and target = 'partner';
  else
    insert into public.role_profiles (name, target, permissions, status)
    values (
      'PartnerManager', 'partner', array[
        'partner:dashboard:view',
        'partner:companies:read','partner:companies:create','partner:companies:update',
        'partner:departments:read','partner:departments:create','partner:departments:update',
        'partner:roles:read','partner:roles:create','partner:roles:update',
        'partner:employees:read','partner:employees:create','partner:employees:update',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view',
        'partner:profile:manage','partner:settings:manage'
      ], 'active'
    );
  end if;
end $$;

do $$
declare
  exists_viewer boolean;
begin
  -- PartnerViewer: read-only
  select exists(
    select 1 from public.role_profiles rp where rp.name = 'PartnerViewer' and rp.target = 'partner'
  ) into exists_viewer;
  if exists_viewer then
    update public.role_profiles
      set permissions = array[
        'partner:dashboard:view',
        'partner:companies:read',
        'partner:departments:read',
        'partner:roles:read',
        'partner:employees:read',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view'
      ],
          status = 'active'
    where name = 'PartnerViewer' and target = 'partner';
  else
    insert into public.role_profiles (name, target, permissions, status)
    values (
      'PartnerViewer', 'partner', array[
        'partner:dashboard:view',
        'partner:companies:read',
        'partner:departments:read',
        'partner:roles:read',
        'partner:employees:read',
        'partner:reports:view','partner:ges:view','partner:assessments:view','partner:links:view'
      ], 'active'
    );
  end if;
end $$;

commit;