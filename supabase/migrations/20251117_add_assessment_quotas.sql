-- Migration para adicionar sistema de cotas de avaliações por empresa

-- Adicionar coluna de cota de avaliações na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS assessment_quota INTEGER DEFAULT 0;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_companies_assessment_quota ON public.companies(assessment_quota);

-- Função para contar avaliações ativas por empresa
CREATE OR REPLACE FUNCTION public.count_company_active_assessments(company_id_param uuid)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM public.assessments 
    WHERE company_id = company_id_param 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de uso de avaliações por empresa
CREATE OR REPLACE FUNCTION public.get_company_assessment_stats(partner_id_param uuid)
RETURNS TABLE (
  company_id uuid,
  company_name text,
  assessment_quota integer,
  used_assessments integer,
  remaining_assessments integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(c.assessment_quota, 0) as assessment_quota,
    public.count_company_active_assessments(c.id) as used_assessments,
    GREATEST(0, COALESCE(c.assessment_quota, 0) - public.count_company_active_assessments(c.id)) as remaining_assessments
  FROM public.companies c
  WHERE c.partner_id = partner_id_param
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissões necessárias
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT UPDATE(assessment_quota) ON public.companies TO authenticated;