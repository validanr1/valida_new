-- Add support for 'semiannual' period in plans and subscriptions
-- This migration is defensive: it attempts to handle either ENUM or CHECK-constraint schemas.

BEGIN;

-- 1) If there is an ENUM type for period (common name guess: plan_period), add the new value
DO $$
DECLARE
  enum_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'plan_period'
  ) INTO enum_exists;

  IF enum_exists THEN
    -- add value if not exists (Postgres supports IF NOT EXISTS from v12+)
    EXECUTE 'ALTER TYPE plan_period ADD VALUE IF NOT EXISTS ''semiannual''';
  END IF;
END
$$;

-- 2) Ensure plans.period allows 'semiannual' even if using CHECK constraint
-- Drop any existing CHECK constraint on plans.period, then recreate including 'semiannual'
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM   pg_constraint c
    JOIN   pg_class rel ON rel.oid = c.conrelid
    JOIN   pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE  c.contype = 'c'
    AND    nsp.nspname = 'public'
    AND    rel.relname = 'plans'
    AND    pg_get_constraintdef(c.oid) ILIKE '%period%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  -- Recreate constraint allowing semiannual
  BEGIN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_period_check CHECK (period IN (''monthly'',''quarterly'',''semiannual'',''yearly''))';
  EXCEPTION WHEN duplicate_object THEN
    -- ignore if already present
    NULL;
  END;
END
$$;

-- 3) Ensure subscriptions.period also allows 'semiannual' (if the column exists)
DO $$
DECLARE
  col_exists boolean;
  r RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name = 'subscriptions'
    AND    column_name = 'period'
  ) INTO col_exists;

  IF col_exists THEN
    -- Try enum approach for a hypothetical subscriptions_period enum
    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'subscriptions_period') THEN
      EXECUTE 'ALTER TYPE subscriptions_period ADD VALUE IF NOT EXISTS ''semiannual''';
    END IF;

    -- Drop any CHECK constraint related to period on subscriptions
    FOR r IN (
      SELECT conname
      FROM   pg_constraint c
      JOIN   pg_class rel ON rel.oid = c.conrelid
      JOIN   pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE  c.contype = 'c'
      AND    nsp.nspname = 'public'
      AND    rel.relname = 'subscriptions'
      AND    pg_get_constraintdef(c.oid) ILIKE '%period%'
    ) LOOP
      EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- Recreate constraint including semiannual
    BEGIN
      EXECUTE 'ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_period_check CHECK (period IN (''monthly'',''quarterly'',''semiannual'',''yearly''))';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;

COMMIT;
