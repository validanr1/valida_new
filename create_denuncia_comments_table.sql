-- Create denuncia_comments table for tracking report history and comments

CREATE TABLE IF NOT EXISTS public.denuncia_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id UUID NOT NULL REFERENCES public.denuncias(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment TEXT,
  status_changed_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_denuncia_comments_denuncia ON public.denuncia_comments(denuncia_id);
CREATE INDEX IF NOT EXISTS idx_denuncia_comments_user ON public.denuncia_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_denuncia_comments_created ON public.denuncia_comments(created_at);

-- Enable RLS
ALTER TABLE public.denuncia_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for authenticated users)
CREATE POLICY "Users can view comments"
ON public.denuncia_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert comments"
ON public.denuncia_comments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
ON public.denuncia_comments FOR UPDATE TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.denuncia_comments FOR DELETE TO authenticated 
USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.denuncia_comments TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_denuncia_comments_updated_at ON public.denuncia_comments;
CREATE TRIGGER update_denuncia_comments_updated_at
  BEFORE UPDATE ON public.denuncia_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
