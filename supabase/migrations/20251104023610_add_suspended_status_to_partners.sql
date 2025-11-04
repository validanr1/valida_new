-- Add 'suspended' to the partners status constraint
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_status_check;
ALTER TABLE partners ADD CONSTRAINT partners_status_check 
  CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
