-- Instruções SQL para aplicar manualmente a migração do campo responsible_position
-- Execute estas queries no console SQL do seu Supabase

-- 1. Verificar se a coluna já existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'companies' 
AND column_name = 'responsible_position';

-- 2. Adicionar a coluna responsible_position (se não existir)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS responsible_position VARCHAR(255);

-- 3. Dar permissões necessárias
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT UPDATE(responsible_position) ON public.companies TO authenticated;

-- 4. Verificar se a coluna foi criada com sucesso
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'companies' 
AND column_name = 'responsible_position';

-- 5. Limpar o cache do schema (se necessário)
-- NOTIFICATION: supabase_functions, schema_updated
-- Isso forçará o Supabase a recarregar o schema