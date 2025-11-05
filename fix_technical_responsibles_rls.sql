-- Fix RLS policies for technical_responsibles table
-- Allow partners to insert and update their own technical responsibles

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Partners can view their technical responsibles" ON technical_responsibles;
DROP POLICY IF EXISTS "Partners can insert their technical responsibles" ON technical_responsibles;
DROP POLICY IF EXISTS "Partners can update their technical responsibles" ON technical_responsibles;
DROP POLICY IF EXISTS "Partners can delete their technical responsibles" ON technical_responsibles;

-- Enable RLS
ALTER TABLE technical_responsibles ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Partners can view their own technical responsibles
CREATE POLICY "Partners can view their technical responsibles"
ON technical_responsibles
FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM partners WHERE id = (auth.jwt() -> 'user_metadata' ->> 'partner_id')::uuid
  )
);

-- Policy for INSERT: Partners can insert their own technical responsibles
CREATE POLICY "Partners can insert their technical responsibles"
ON technical_responsibles
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IN (
    SELECT id FROM partners WHERE id = (auth.jwt() -> 'user_metadata' ->> 'partner_id')::uuid
  )
);

-- Policy for UPDATE: Partners can update their own technical responsibles
CREATE POLICY "Partners can update their technical responsibles"
ON technical_responsibles
FOR UPDATE
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM partners WHERE id = (auth.jwt() -> 'user_metadata' ->> 'partner_id')::uuid
  )
)
WITH CHECK (
  partner_id IN (
    SELECT id FROM partners WHERE id = (auth.jwt() -> 'user_metadata' ->> 'partner_id')::uuid
  )
);

-- Policy for DELETE: Partners can delete their own technical responsibles
CREATE POLICY "Partners can delete their technical responsibles"
ON technical_responsibles
FOR DELETE
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM partners WHERE id = (auth.jwt() -> 'user_metadata' ->> 'partner_id')::uuid
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON technical_responsibles TO authenticated;
