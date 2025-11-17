-- Adicionar limite de denúncias aos planos
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS complaint_limit INTEGER DEFAULT 0;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.plans.complaint_limit IS 'Número máximo de denúncias permitidas no plano (0 = ilimitado)';

-- Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_plans_complaint_limit ON public.plans(complaint_limit);