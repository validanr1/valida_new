-- Apply NR1 template content to partners table
-- This will update all partners that don't have report_config set

UPDATE partners
SET report_config = '{
  "title": "RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS RELACIONADOS AO TRABALHO",
  "subtitle": "NR-1, NR-17, Guia de Fatores Psicossociais, HSE-SIT, ISO 45003",
  "introduction": "Este relatório de fatores de riscos psicossociais relacionados ao trabalho integra as ações de avaliação, identificação, registro, análise, acompanhamento e controle dos fatores de riscos psicossociais existentes nas organizações, conforme estabelecido na NR-1, NR-17, no Guia Técnico sobre Fatores Psicossociais do Ministério do Trabalho, na norma HSE-SIT e na ISO 45003.\n\nO presente relatório tem como objetivo apresentar os resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho, identificando as principais fontes geradoras de riscos, as áreas críticas e as recomendações para implementação de medidas de controle e prevenção.\n\nA metodologia aplicada baseia-se nos princípios da ergonomia, da psicologia do trabalho e da segurança e saúde ocupacional, considerando as especificidades das atividades desenvolvidas, as características organizacionais e os aspectos ambientais relevantes.",
  "conclusion": "A análise dos resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho demonstrou a importância da implementação de um programa de gestão integrada de segurança e saúde ocupacional, com foco específico nos aspectos psicossociais.\n\nAs recomendações apresentadas visam promover a melhoria contínua das condições de trabalho, considerando que a prevenção de riscos psicossociais contribui significativamente para: redução do absenteísmo, aumento da produtividade, melhoria do clima organizacional, redução de custos com saúde e seguros, e cumprimento da legislação trabalhista e previdenciária.\n\nÉ fundamental que as medidas propostas sejam implementadas de forma participativa, envolvendo os trabalhadores, as lideranças e a gestão, garantindo assim sua eficácia e sustentabilidade.",
  "sections": {
    "companyInfo": true,
    "technicalResponsibles": true,
    "scope": true,
    "technicalSources": true,
    "legalSources": true,
    "methodologies": true,
    "riskIdentification": true,
    "strategies": true,
    "resultAnalysis": true,
    "conclusion": true,
    "finalConsiderations": true,
    "categoryIndicators": true,
    "categoryDetails": true,
    "actionPlan": true
  }
}'::jsonb
WHERE report_config IS NULL OR report_config = '{}'::jsonb;

-- Add comment to the column if it doesn't exist
COMMENT ON COLUMN partners.report_config IS 'Configuração personalizada do relatório NR1 incluindo título, subtítulo, introdução, conclusão e visibilidade de seções';

-- Verify the update
SELECT id, name, report_config->>'title' as report_title 
FROM partners 
WHERE report_config IS NOT NULL 
LIMIT 5