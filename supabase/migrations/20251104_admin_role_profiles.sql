-- Seed default Admin role profiles (idempotent)
-- Creates AdminSuper, AdminManager, AdminViewer with permissions scoped to target 'admin'
-- Safe to run multiple times; updates existing rows and inserts missing ones
do $$
begin
  -- AdminSuper: full access
  if exists (
    select 1 from public.role_profiles rp
    where rp.key = 'AdminSuper' and rp.target = 'admin'
  ) then
    update public.role_profiles
    set name = 'Administrador (Super)',
        target = 'admin',
        status = 'active',
        permissions = '{
          "dashboard:view": true,
          "partners:read": true, "partners:create": true, "partners:update": true, "partners:delete": true,
          "plans:read": true, "plans:create": true, "plans:update": true, "plans:delete": true,
          "sales:read": true, "sales:write": true,
          "subscriptions:read": true, "subscriptions:write": true,
          "billing:read": true, "billing:write": true,
          "companies:read": true, "companies:create": true, "companies:update": true, "companies:delete": true,
          "assessments:view": true,
          "reports:view": true,
          "platform_ratings:read": true,
          "emails:send": true,
          "settings:read": true, "settings:write": true,
          "settings:access_profiles:write": true,
          "settings:questionnaires:write": true,
          "settings:templates:write": true,
          "settings:risk_grades:write": true,
          "settings:levels:write": true,
          "settings:email_templates:write": true,
          "users:read": true, "users:create": true, "users:update": true, "users:delete": true
        }'::jsonb,
        updated_at = now()
    where key = 'AdminSuper' and target = 'admin';
  else
    insert into public.role_profiles (key, name, target, status, permissions)
    values (
      'AdminSuper', 'Administrador (Super)', 'admin', 'active',
      '{
        "dashboard:view": true,
        "partners:read": true, "partners:create": true, "partners:update": true, "partners:delete": true,
        "plans:read": true, "plans:create": true, "plans:update": true, "plans:delete": true,
        "sales:read": true, "sales:write": true,
        "subscriptions:read": true, "subscriptions:write": true,
        "billing:read": true, "billing:write": true,
        "companies:read": true, "companies:create": true, "companies:update": true, "companies:delete": true,
        "assessments:view": true,
        "reports:view": true,
        "platform_ratings:read": true,
        "emails:send": true,
        "settings:read": true, "settings:write": true,
        "settings:access_profiles:write": true,
        "settings:questionnaires:write": true,
        "settings:templates:write": true,
        "settings:risk_grades:write": true,
        "settings:levels:write": true,
        "settings:email_templates:write": true,
        "users:read": true, "users:create": true, "users:update": true, "users:delete": true
      }'::jsonb
    );
  end if;

  -- AdminManager: manage most resources, limited destructive actions
  if exists (
    select 1 from public.role_profiles rp
    where rp.key = 'AdminManager' and rp.target = 'admin'
  ) then
    update public.role_profiles
    set name = 'Administrador (Manager)',
        target = 'admin',
        status = 'active',
        permissions = '{
          "dashboard:view": true,
          "partners:read": true, "partners:create": true, "partners:update": true,
          "plans:read": true, "plans:create": true, "plans:update": true,
          "sales:read": true, "sales:write": true,
          "subscriptions:read": true, "subscriptions:write": true,
          "billing:read": true, "billing:write": true,
          "companies:read": true, "companies:create": true, "companies:update": true,
          "assessments:view": true,
          "reports:view": true,
          "platform_ratings:read": true,
          "emails:send": true,
          "settings:read": true,
          "users:read": true, "users:create": true, "users:update": true
        }'::jsonb,
        updated_at = now()
    where key = 'AdminManager' and target = 'admin';
  else
    insert into public.role_profiles (key, name, target, status, permissions)
    values (
      'AdminManager', 'Administrador (Manager)', 'admin', 'active',
      '{
        "dashboard:view": true,
        "partners:read": true, "partners:create": true, "partners:update": true,
        "plans:read": true, "plans:create": true, "plans:update": true,
        "sales:read": true, "sales:write": true,
        "subscriptions:read": true, "subscriptions:write": true,
        "billing:read": true, "billing:write": true,
        "companies:read": true, "companies:create": true, "companies:update": true,
        "assessments:view": true,
        "reports:view": true,
        "platform_ratings:read": true,
        "emails:send": true,
        "settings:read": true,
        "users:read": true, "users:create": true, "users:update": true
      }'::jsonb
    );
  end if;

  -- AdminViewer: read-only across admin modules
  if exists (
    select 1 from public.role_profiles rp
    where rp.key = 'AdminViewer' and rp.target = 'admin'
  ) then
    update public.role_profiles
    set name = 'Administrador (Viewer)',
        target = 'admin',
        status = 'active',
        permissions = '{
          "dashboard:view": true,
          "partners:read": true,
          "plans:read": true,
          "sales:read": true,
          "subscriptions:read": true,
          "billing:read": true,
          "companies:read": true,
          "assessments:view": true,
          "reports:view": true,
          "platform_ratings:read": true,
          "settings:read": true,
          "users:read": true
        }'::jsonb,
        updated_at = now()
    where key = 'AdminViewer' and target = 'admin';
  else
    insert into public.role_profiles (key, name, target, status, permissions)
    values (
      'AdminViewer', 'Administrador (Viewer)', 'admin', 'active',
      '{
        "dashboard:view": true,
        "partners:read": true,
        "plans:read": true,
        "sales:read": true,
        "subscriptions:read": true,
        "billing:read": true,
        "companies:read": true,
        "assessments:view": true,
        "reports:view": true,
        "platform_ratings:read": true,
        "settings:read": true,
        "users:read": true
      }'::jsonb
    );
  end if;
end $$;