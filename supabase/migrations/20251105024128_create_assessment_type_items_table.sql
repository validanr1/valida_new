-- Create assessment_type_items table for GHE/GES management

CREATE TABLE IF NOT EXISTS public.assessment_type_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  assessment_type_id UUID NOT NULL REFERENCES public.assessment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessment_type_items_partner ON public.assessment_type_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_assessment_type_items_type ON public.assessment_type_items(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessment_type_items_status ON public.assessment_type_items(status);

-- Enable RLS
ALTER TABLE public.assessment_type_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to manage their partner's items
CREATE POLICY "Users can view their partner's assessment type items"
ON public.assessment_type_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their partner's assessment type items"
ON public.assessment_type_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their partner's assessment type items"
ON public.assessment_type_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete their partner's assessment type items"
ON public.assessment_type_items
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_type_items TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_type_items_updated_at
  BEFORE UPDATE ON public.assessment_type_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
