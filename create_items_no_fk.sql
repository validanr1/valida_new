-- Create assessment_type_items table WITHOUT foreign key to assessment_types
-- (assessment_types is a view, not a table, so we can't create FK to it)

CREATE TABLE IF NOT EXISTS public.assessment_type_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  assessment_type_id UUID NOT NULL,
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view assessment type items" ON public.assessment_type_items;
DROP POLICY IF EXISTS "Users can insert assessment type items" ON public.assessment_type_items;
DROP POLICY IF EXISTS "Users can update assessment type items" ON public.assessment_type_items;
DROP POLICY IF EXISTS "Users can delete assessment type items" ON public.assessment_type_items;

-- RLS Policies (permissive for testing)
CREATE POLICY "Users can view assessment type items"
ON public.assessment_type_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert assessment type items"
ON public.assessment_type_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update assessment type items"
ON public.assessment_type_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete assessment type items"
ON public.assessment_type_items FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_type_items TO authenticated;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for assessment_type_items
DROP TRIGGER IF EXISTS update_assessment_type_items_updated_at ON public.assessment_type_items;
CREATE TRIGGER update_assessment_type_items_updated_at
  BEFORE UPDATE ON public.assessment_type_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
