-- Add custom_conclusion field to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS custom_conclusion TEXT;

-- Add comment to the column
COMMENT ON COLUMN partners.custom_conclusion IS 'Custom conclusion text for reports that can be edited by the partner';
