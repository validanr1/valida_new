-- Migration simples para popular o conteúdo do template NR1
-- Atualiza partners que já têm a coluna report_config

UPDATE partners
SET report_config = jsonb_build_object(
  'title', 'RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS RELACIONADOS AO TRABALHO',
  'subtitle', 'NR-1, NR-17, Guia de Fatores Psicossociais, HSE-SIT, ISO 45003',
  'introduction', 'Este relatório de fatores de riscos psicossociais relacionados ao trabalho integra as ações de avaliação, identificação, registro, análise, acompanhamento e controle dos fatores de riscos psicossociais existentes nas organizações, conforme estabelecido na NR-1, NR-17, no Guia Técnico sobre Fatores Psicossociais do Ministério do Trabalho, na norma HSE-SIT e na ISO 45003.' || chr(10) || chr(10) ||
           'O presente relatório tem como objetivo apresentar os resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho, identificando as principais fontes geradoras de riscos, as áreas críticas e as recomendações para implementação de medidas de controle e prevenção.' || chr(10) || chr(10) ||
           'A metodologia aplicada baseia-se nos princípios da ergonomia, da psicologia do trabalho e da segurança e saúde ocupacional, considerando as especificidades das atividades desenvolvidas, as características organizacionais e os aspectos ambientais relevantes.',
  'conclusion', 'A análise dos resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho demonstrou a importância da implementação de um programa de gestão integrada de segurança e saúde ocupacional, com foco específico nos aspectos psicossociais.' || chr(10) || chr(10) ||
           'As recomendações apresentadas visam promover a melhoria contínua das condições de trabalho, considerando que a prevenção de riscos psicossociais contribui significativamente para: redução do absenteísmo, aumento da produtividade, melhoria do clima organizacional, redução de custos com saúde e seguros, e cumprimento da legislação trabalhista e previdenciária.' || chr(10) || chr(10) ||
           'É fundamental que as medidas propostas sejam implementadas de forma participativa, envolvendo os trabalhadores, as lideranças e a gestão, garantindo assim sua eficácia e sustentabilidade.',
  'sections', jsonb_build_object(
    'companyInfo', true,
    'technicalResponsibles', true,
    'scope', true,
    'technicalSources', true,
    'legalSources', true,
    'methodologies', true,
    'riskIdentification', true,
    'strategies', true,
    'resultAnalysis', true,
    'conclusion', true,
    'finalConsiderations', true,
    'categoryIndicators', true,
    'categoryDetails', true,
    'actionPlan', true
  )
)
WHERE report_config IS NULL OR report_config = '{}'::jsonb;

-- Se quiser atualizar todos os partners (descomente a linha abaixo se necessário)
-- UPDATE partners SET report_config = jsonb_build_object(...) WHERE 1=1;