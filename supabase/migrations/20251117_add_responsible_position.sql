-- Migration para adicionar campo de cargo do responsável na tabela companies

-- Adicionar coluna responsible_position na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS responsible_position VARCHAR(255);

-- Dar permissões necessárias
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT UPDATE(responsible_position) ON public.companies TO authenticated;