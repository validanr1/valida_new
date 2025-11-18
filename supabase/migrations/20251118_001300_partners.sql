-- Adicionar coluna report_config à tabela partners
ALTER TABLE partners 
ADD COLUMN report_config JSONB DEFAULT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN partners.report_config IS 'Configurações personalizadas do relatório (título, subtítulo, introdução, conclusão, seções)';