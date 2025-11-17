-- Tabela para armazenar templates de relatórios personalizados
CREATE TABLE report_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca eficiente por parceiro
CREATE INDEX idx_report_templates_partner_id ON report_templates(partner_id);

-- Índice para busca por nome
CREATE INDEX idx_report_templates_name ON report_templates(name);

-- RLS (Row Level Security) - habilitar
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Política para permitir que parceiros vejam apenas seus próprios templates
CREATE POLICY "Parceiros podem ver seus próprios templates" ON report_templates
    FOR SELECT USING (auth.uid() = partner_id);

-- Política para permitir que parceiros criem templates
CREATE POLICY "Parceiros podem criar templates" ON report_templates
    FOR INSERT WITH CHECK (auth.uid() = partner_id);

-- Política para permitir que parceiros atualizem seus próprios templates
CREATE POLICY "Parceiros podem atualizar seus próprios templates" ON report_templates
    FOR UPDATE USING (auth.uid() = partner_id);

-- Política para permitir que parceiros deletem seus próprios templates
CREATE POLICY "Parceiros podem deletar seus próprios templates" ON report_templates
    FOR DELETE USING (auth.uid() = partner_id);

-- Conceder permissões para os roles anon e authenticated
GRANT SELECT ON report_templates TO anon;
GRANT SELECT ON report_templates TO authenticated;
GRANT INSERT ON report_templates TO authenticated;
GRANT UPDATE ON report_templates TO authenticated;
GRANT DELETE ON report_templates TO authenticated;