import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Building2 } from "lucide-react";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showError, showSuccess } from "@/utils/toast";
import html2pdf from 'html2pdf.js';

// Inject print styles
if (typeof document !== 'undefined') {
  const styleId = 'report-print-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @media print {
        .no-print { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; }
        .report-content { margin-top: 0 !important; padding-top: 20px !important; }
        .fixed, .sticky { position: relative !important; }
        .shadow-lg, .shadow-xl, .shadow-md { box-shadow: none !important; }
        .report-section { page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Dados básicos já usados no Overview
type Company = { id: string; name: string; partner_id: string; cnpj?: string | null; cnae?: string | null; address?: string | null; responsible_name?: string | null; responsible_email?: string | null };
type TechnicalResponsible = {
  id: string;
  partner_id: string | null;
  company_id: string | null;
  is_primary: boolean | null;
  name: string | null;
  council: string | null;
  registration: string | null;
  profession: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};
interface ProcessedQuestion {
  id: string;
  text: string;
  order?: number;
  averageScore: number;
  responseDistribution: { favorable: number; neutral: number; unfavorable: number };
  category_id?: string | null;
}
interface ProcessedCategory {
  id: string;
  name: string;
  description?: string;
  averageScore: number;
  questions: ProcessedQuestion[];
  responseDistribution?: { favorable: number; neutral: number; unfavorable: number };
}

// DB Action Plans
type ActionPlanCategory = { id: string; name: string };
type ActionPlan = {
  id: string;
  category_id: string | null;
  description: string;
  is_global: boolean;
  partner_id: string | null;
  show_in_report?: boolean;
  score_min?: number | null;
  score_max?: number | null;
};

const defaultTemplate = `Relatório Narrativo — {{empresa.nome}}
Gerado em: {{dataGeracao}}

Pontuação geral: {{pontuacaoGeral}}

Resumo por categoria:
{{categorias_resumo}}

Detalhamento por categoria:
{{categorias_detalhes}}
`;

const NewTemplateReport = () => {
  const { session } = useSession();
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [overallAverageScore, setOverallAverageScore] = useState<number | null>(null);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [overallDistribution, setOverallDistribution] = useState<{ favorable: number; neutral: number; unfavorable: number; total: number }>({ favorable: 0, neutral: 0, unfavorable: 0, total: 0 });
  const [processedQuestions, setProcessedQuestions] = useState<ProcessedQuestion[]>([]);
  const [globalActionPlans, setGlobalActionPlans] = useState<any[]>([]);

  const [templateText, setTemplateText] = useState<string>(defaultTemplate);
  const [renderedText, setRenderedText] = useState<string>("");
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingConclusion, setEditingConclusion] = useState<boolean>(false);
  const [conclusionText, setConclusionText] = useState<string>("");
  const [savingConclusion, setSavingConclusion] = useState<boolean>(false);
  const [tocItems, setTocItems] = useState<string[]>([
    "Identificação da Empresa",
    "Responsáveis Técnicos",
    "Escopo do Trabalho",
    "Fontes Técnicas – Organizacionais",
    "Fontes Jurídicas",
    "Metodologia de Avaliação",
    "Identificação dos riscos psicossociais",
    "Estratégias de Avaliação",
    "Análise do Resultado",
    "Conclusão",
    "Considerações Finais",
    "Anexo I – Resultado das Avaliações",
    "Anexo II – Análise e Inventário",
    "Anexo III – Plano de Ação e Monitoramento",
  ]);
  const [tocText, setTocText] = useState<string>("");
  useEffect(() => { setTocText(tocItems.join("\n")); }, []);
  type ReportSection = { key: string; title: string; body: string };
  const [sections, setSections] = useState<ReportSection[]>([
    { key: "escopo", title: "Escopo do Trabalho", body: "Este <span style='font-weight: 700;'>relatório de fatores de riscos psicossociais relacionados ao trabalho</span> integra as ações de avaliação das condições laborais dos colaboradores, com ênfase na identificação e análise técnica dos <span style='font-weight: 700;'>fatores de riscos psicossociais presentes no ambiente de trabalho</span>. Seu objetivo é contribuir para a promoção da saúde mental, bem-estar e produtividade dos trabalhadores, bem como para o cumprimento da legislação vigente.\n\nO <span style='font-weight: 700;'>relatório de riscos psicossociais relacionados ao trabalho em conformidade com as diretrizes da NR-01</span>, atualizada pela <span style='font-weight: 700;'>Portaria MTE nº 1.419/2024</span> e vigente a partir de maio de 2026, que passou a integrar de forma formal os fatores psicossociais ao Gerenciamento de Riscos Ocupacionais (GRO). Também atende à <span style='font-weight: 700;'>NR-17</span>, ao <span style='font-weight: 700;'>Guia de Informações sobre Fatores Psicossociais Relacionados ao Trabalho (MTE)</span>, às recomendações da <span style='font-weight: 700;'>HSE-SIT (Health and Safety Executive)</span> e à <span style='font-weight: 700;'>norma internacional ISO 45003</span>, assegurando alinhamento com as melhores práticas nacionais e internacionais em Saúde e Segurança do Trabalho.\n\nAlém de atender aos requisitos legais, este relatório oferece subsídios técnicos fundamentados para decisões estratégicas no âmbito do <span style='font-weight: 700;'>Programa de Gerenciamento de Riscos (PGR)</span>, como:\n\n• Aprofundamento das análises por meio de <span style='font-weight: 700;'>Análise Ergonômica do Trabalho (AEP/AET)</span>, quando aplicável;\n• Priorização de medidas de prevenção e controle;\n• Definição de planos de ação alinhados ao PGR voltados à construção de ambientes de trabalho mais saudáveis, seguros e produtivos." },
    { key: "fontesTecnicas", title: "Fontes Técnicas – Organizacionais", body: "• <span style='font-weight: 700;'>Condições de Trabalho</span> – Aspectos relacionados ao ambiente físico e aos recursos disponíveis, incluindo iluminação inadequada, níveis de ruído excessivos, mobiliário e ferramentas desatualizados ou inadequados, e a falta ou inadequação de Equipamentos de Proteção Individual (EPIs).\n\n• <span style='font-weight: 700;'>Organização do Trabalho</span> – Fatores relacionados à estrutura e gestão do trabalho, como a imposição de metas irrealistas, ritmo de trabalho excessivo, ausência de pausas suficientes, falta de autonomia nas funções, falhas na comunicação interna e sobrecarga de tarefas." },
    { key: "fontesJuridicas", title: "Fontes Jurídicas", body: "• <span style='font-weight: 700;'>NR-01: Disposições Gerais</span> – Portaria MTE nº 1.419/2024, que estabelece as diretrizes gerais para o gerenciamento de riscos ocupacionais, incluindo a identificação e controle de riscos psicossociais no ambiente de trabalho. \"Embora a norma não defina exatamente o que são riscos psicossociais, podemos entender que são aqueles que afetam a saúde mental dos trabalhadores gerando, por exemplo, sintomas como estresse, ansiedade, depressão, como resultado da prática de assédio moral, excesso de trabalho, metas excessivas e abusivas, falta de apoio das chefias ou dos colegas.\"\n\n• <span style='font-weight: 700;'>NR-17: Ergonomia</span> – Portaria MTP nº 4.219/2022, que regula as condições ergonômicas no ambiente laboral, abrangendo aspectos relacionados ao conforto, segurança e saúde física e mental dos trabalhadores.\n\n• <span style='font-weight: 700;'>ISO 45003:2021</span> – Diretrizes internacionais para a gestão de riscos psicossociais na saúde e segurança ocupacional, oferecendo abordagens práticas para identificar, avaliar e mitigar fatores que afetam o bem-estar mental no trabalho." },
    { key: "metodologias", title: "Metodologia de Avaliação", body: "Metodologia <span style='font-weight: 700;'>SIT - HSE Stress Indicator Tool</span> integrada a PLATAFORMA. A ferramenta traz uma pesquisa para identificar e mensurar os riscos psicossociais, com <span style='font-weight: 700;'>trinta e cinco perguntas</span> que abordam áreas principais de trabalho que, se não gerenciados adequadamente, são conhecidos por serem causas potenciais de estresse no local de trabalho.\n\n<span style='font-weight: 700;'>Etapas da metodologia SIT</span>\n\nNa prática, a aplicação do SIT segue uma abordagem sistemática utilizando um questionário estruturado ocorrendo da seguinte forma:\n\nI. <span style='font-weight: 700;'>Coleta de Dados</span>\n\nOs Colaboradores respondem a um questionário que avaliam seis fatores críticos do ambiente de trabalho:\n\n• <span style='font-weight: 700;'>Demandas:</span> carga de trabalho, padrões de trabalho e ambiente\n• <span style='font-weight: 700;'>Controle:</span> autonomia sobre como o trabalho é realizado\n• <span style='font-weight: 700;'>Suporte:</span> apoio da gestão e dos colegas\n• <span style='font-weight: 700;'>Relacionamentos:</span> prevenção de conflitos e assédio\n• <span style='font-weight: 700;'>Papel:</span> clareza das funções e ausência de conflitos de responsabilidade\n• <span style='font-weight: 700;'>Mudanças:</span> gestão e comunicação sobre mudanças organizacionais\n\nII. <span style='font-weight: 700;'>Análise e Pontuação</span>\n\nA escala de pontuação é baseada em uma escala de 5 pontos, com as seguintes opções de resposta: Nunca, raramente, às vezes, frequentemente e sempre. As respostas são classificadas em três categorias principais:\n\n• <span style='font-weight: 700;'>Favorável:</span> Indica boas condições de trabalho e aspectos positivos no ambiente organizacional. Respostas possíveis: <span style='font-weight: 700;'>Frequentemente e Sempre</span>\n\n• <span style='font-weight: 700;'>Neutro:</span> Representa uma posição intermediária, sem uma inclinação clara para o positivo ou negativo. Resposta possível: <span style='font-weight: 700;'>Às vezes</span>\n\n• <span style='font-weight: 700;'>Desfavorável:</span> Aponta possíveis problemas que podem afetar a saúde, segurança e bem-estar dos funcionários. Respostas possíveis: <span style='font-weight: 700;'>Nunca e Raramente.</span>" },
    { key: "identificacaoRiscos", title: "Identificação dos Riscos Psicossociais", body: "<span style='font-weight: 700;'>Fatores de Risco Psicossocial:</span>\n\n• Sobrecarga de trabalho\n• Ausência de autonomia ou participação nas decisões\n• Assédio moral ou sexual\n• Pressão por metas inalcançáveis\n• Comunicação deficiente ou inadequada\n• Jornadas de trabalho extensas ou irregulares\n• Ambiente organizacional hostil ou tóxico\n• Falta de apoio, reconhecimento ou valorização profissional\n• Insegurança quanto à estabilidade no emprego" },
    { key: "estrategias", title: "Estratégias de Avaliação", body: "Aplicação de questionário <span style='font-weight: 700;'>online, ou presencial</span> de forma <span style='font-weight: 700;'>individual</span> e <span style='font-weight: 700;'>anônima</span>, garantindo total confidencialidade e a integridade das respostas fornecidas." },
    { key: "analiseResultado", title: "Análise do Resultado", body: "A análise foi realizada a partir das respostas coletadas, com cruzamentos estatísticos, interpretando as variáveis psicossociais de acordo com as normas técnicas e regulamentações legais pertinentes." },
    { key: "conclusao", title: "Conclusão", body: "Com base na análise, conclui-se que, no momento da avaliação, os colaboradores não estão expostos a riscos psicossociais relevantes, conforme critérios das NR-01 e NR-17. A empresa deverá acompanhar continuamente os indicadores de clima organizacional e saúde mental." },
    { key: "consideracoes", title: "Considerações Finais", body: "Alterações em processos, cargos ou condições de trabalho devem motivar reavaliação psicossocial conforme a NR-01. Este relatório reflete as condições no momento da emissão." },
  ]);

  const [reportConfig, setReportConfig] = useState<any>({
    title: "RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS RELACIONADOS AO TRABALHO",
    subtitle: "NR-1, NR-17, Guia de Fatores Psicossociais, HSE-SIT, ISO 45003",
    introduction: `Este relatório de fatores de riscos psicossociais relacionados ao trabalho integra as ações de avaliação, identificação, registro, análise, acompanhamento e controle dos fatores de riscos psicossociais existentes nas organizações, conforme estabelecido na NR-1, NR-17, no Guia Técnico sobre Fatores Psicossociais do Ministério do Trabalho, na norma HSE-SIT e na ISO 45003.

O presente relatório tem como objetivo apresentar os resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho, identificando as principais fontes geradoras de riscos, as áreas críticas e as recomendações para implementação de medidas de controle e prevenção.

A metodologia aplicada baseia-se nos princípios da ergonomia, da psicologia do trabalho e da segurança e saúde ocupacional, considerando as especificidades das atividades desenvolvidas, as características organizacionais e os aspectos ambientais relevantes.`,
    conclusion: `A análise dos resultados da avaliação dos fatores de riscos psicossociais relacionados ao trabalho demonstrou a importância da implementação de um programa de gestão integrada de segurança e saúde ocupacional, com foco específico nos aspectos psicossociais.

As recomendações apresentadas visam promover a melhoria contínua das condições de trabalho, considerando que a prevenção de riscos psicossociais contribui significativamente para: redução do absenteísmo, aumento da produtividade, melhoria do clima organizacional, redução de custos com saúde e seguros, e cumprimento da legislação trabalhista e previdenciária.

É fundamental que as medidas propostas sejam implementadas de forma participativa, envolvendo os trabalhadores, as lideranças e a gestão, garantindo assim sua eficácia e sustentabilidade.`,
    sections: {
      companyInfo: true,
      technicalResponsibles: true,
      scope: true,
      technicalSources: true,
      legalSources: true,
      methodologies: true,
      riskIdentification: true,
      strategies: true,
      resultAnalysis: true,
      conclusion: true,
      finalConsiderations: true,
      categoryIndicators: true,
      categoryDetails: true,
      actionPlan: true
    }
  });

  const handleEditConclusion = () => {
    const currentConclusion = getSection("conclusao")?.body || "";
    setConclusionText(currentConclusion);
    setEditingConclusion(true);
  };

  const handleSaveConclusion = async () => {
    if (!partnerId) return;
    
    setSavingConclusion(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ custom_conclusion: conclusionText })
        .eq("id", partnerId);
      
      if (error) throw error;
      
      // Update local state
      setSections(prev => prev.map(section => 
        section.key === "conclusao" 
          ? { ...section, body: conclusionText }
          : section
      ));
      
      setEditingConclusion(false);
      alert("Conclusão salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar conclusão:", error);
      alert("Erro ao salvar conclusão. Tente novamente.");
    } finally {
      setSavingConclusion(false);
    }
  };

  const handleResetConclusion = async () => {
    if (!partnerId) return;
    if (!confirm("Deseja restaurar o texto padrão da conclusão?")) return;
    
    setSavingConclusion(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ custom_conclusion: null })
        .eq("id", partnerId);
      
      if (error) throw error;
      
      // Reset to default text
      const defaultConclusion = "Com base na análise, conclui-se que, no momento da avaliação, os colaboradores não estão expostos a riscos psicossociais relevantes, conforme critérios das NR-01 e NR-17. A empresa deverá acompanhar continuamente os indicadores de clima organizacional e saúde mental.";
      setSections(prev => prev.map(section => 
        section.key === "conclusao" 
          ? { ...section, body: defaultConclusion }
          : section
      ));
      
      setEditingConclusion(false);
      alert("Conclusão restaurada para o texto padrão!");
    } catch (error) {
      console.error("Erro ao restaurar conclusão:", error);
      alert("Erro ao restaurar conclusão. Tente novamente.");
    } finally {
      setSavingConclusion(false);
    }
  };

  const fmtPercent = (v?: number | null) => (typeof v === "number" ? `${v.toFixed(1)}%` : "—");
  const formatAddress = (addr: any): string => {
    if (!addr) return "—";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      const parts = [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipcode].filter(Boolean);
      return parts.length ? parts.join(", ") : "—";
    }
    return "—";
  };

  const getSection = (key: string) => sections.find(s => s.key === key) as ReportSection;
  const updateSection = (key: string, patch: Partial<ReportSection>) => {
    setSections(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)));
  };

  const [departmentNames, setDepartmentNames] = useState<string>("");
  const [assessmentDateRange, setAssessmentDateRange] = useState<string>("");
  const [apCategories, setApCategories] = useState<ActionPlanCategory[]>([]);
  const [apByCategory, setApByCategory] = useState<Record<string, ActionPlan[]>>({});
  const [primaryResponsible, setPrimaryResponsible] = useState<TechnicalResponsible | null>(null);
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string>("Valida NR1");

  useEffect(() => {
    if (!companyId || !partnerId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, name, partner_id, cnpj, cnae, address, responsible_name, responsible_email")
          .eq("id", companyId)
          .maybeSingle();
        setCompany(companyData as Company);

        const { data: platformData } = await supabase
          .from("partners")
          .select("platform_name")
          .eq("id", partnerId)
          .maybeSingle();
        setPlatformName(platformData?.platform_name || "Valida NR1");

        const { data: partnerConfigData } = await supabase
          .from("partners")
          .select("logo_data_url, custom_conclusion")
          .eq("id", partnerId)
          .maybeSingle();
        setPartnerLogo(partnerConfigData?.logo_data_url || null);
        
        // Load custom conclusion if available
        if (partnerConfigData?.custom_conclusion) {
          setSections(prev => prev.map(section => 
            section.key === "conclusao" 
              ? { ...section, body: partnerConfigData.custom_conclusion }
              : section
          ));
        }

        let tr: TechnicalResponsible | null = null;
        {
          const { data, error } = await supabase
            .from('technical_responsibles')
            .select('id,partner_id,company_id,is_primary,name,council,registration,profession,contact_email,contact_phone')
            .eq('partner_id', partnerId)
            .eq('company_id', companyId)
            .eq('is_primary', true)
            .limit(1);
          if (!error && data?.length) tr = data[0] as TechnicalResponsible;
        }
        if (!tr) {
          const { data, error } = await supabase
            .from('technical_responsibles')
            .select('id,partner_id,company_id,is_primary,name,council,registration,profession,contact_email,contact_phone')
            .eq('partner_id', partnerId)
            .eq('is_primary', true)
            .limit(1);
          if (!error && data?.length) tr = data[0] as TechnicalResponsible;
        }
        setPrimaryResponsible(tr);

        const { data: deps } = await supabase.from("departments").select("name").eq("company_id", companyId);
        setDepartmentNames((deps || []).map((d: any) => d.name).join(", "));

        const { data: evalData } = await supabase
          .from("assessments")
          .select("created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true })
          .limit(1);
        const firstDate = evalData?.[0]?.created_at ? new Date(evalData[0].created_at) : null;
        const lastDate = new Date();
        if (firstDate) {
          setAssessmentDateRange(`${firstDate.toLocaleDateString('pt-BR')} a ${lastDate.toLocaleDateString('pt-BR')}`);
        }

        const { data: evals } = await supabase.from("assessments").select("id,created_at").eq("company_id", companyId);
        const evaluationIds = (evals || []).map((e: any) => e.id);
        if (!evaluationIds.length) {
          setOverallAverageScore(null); setProcessedCategories([]); setLoading(false); return;
        }

        const { data: questionsData } = await supabase
          .from("questions")
          .select("id,text,order,category_id")
          .order("order", { ascending: true });
        const questionsMap = new Map((questionsData || []).map((q: any) => [q.id, q]));

        const { data: answersData } = await supabase
          .from("assessment_responses")
          .select("assessment_id,question_id,scored_value")
          .in("assessment_id", evaluationIds);

        const scoresByQuestion = new Map<string, number[]>();
        (answersData || []).forEach((a: any) => {
          const arr = scoresByQuestion.get(a.question_id) || [];
          arr.push(a.scored_value);
          scoresByQuestion.set(a.question_id, arr);
        });

        const { data: categoriesData } = await supabase.from("question_categories").select("id,name,description");
        const categoriesMap = new Map((categoriesData || []).map((c: any) => [c.id, c]));

        const processed: ProcessedCategory[] = [];
        const categoryScores = new Map<string, number[]>();
        const questionsProcessed: ProcessedQuestion[] = [];

        Array.from(scoresByQuestion.entries()).forEach(([questionId, scores]) => {
          const q = questionsMap.get(questionId);
          if (!q) return;
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const favorable = scores.filter((s) => s >= 75).length;
          const neutral = scores.filter((s) => s >= 40 && s < 75).length;
          const unfavorable = scores.filter((s) => s < 40).length;
          const total = scores.length;
          
          // Store processed question with distribution
          questionsProcessed.push({
            id: questionId,
            text: q.text,
            order: q.order,
            averageScore: avg,
            responseDistribution: {
              favorable: total > 0 ? parseFloat(((favorable / total) * 100).toFixed(2)) : 0,
              neutral: total > 0 ? parseFloat(((neutral / total) * 100).toFixed(2)) : 0,
              unfavorable: total > 0 ? parseFloat(((unfavorable / total) * 100).toFixed(2)) : 0
            },
            category_id: q.category_id
          });
          
          const categoryId = q.category_id;
          if (categoryId) {
            const catArr = categoryScores.get(categoryId) || [];
            catArr.push(avg);
            categoryScores.set(categoryId, catArr);
          }
        });
        
        setProcessedQuestions(questionsProcessed);

        categoryScores.forEach((scores, categoryId) => {
          const cat = categoriesMap.get(categoryId);
          if (!cat) return;
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          
          // Calculate distribution for this category
          const favorable = scores.filter((s) => s >= 75).length;
          const neutral = scores.filter((s) => s >= 40 && s < 75).length;
          const unfavorable = scores.filter((s) => s < 40).length;
          const total = scores.length;
          
          const responseDistribution = {
            favorable: total > 0 ? parseFloat(((favorable / total) * 100).toFixed(2)) : 0,
            neutral: total > 0 ? parseFloat(((neutral / total) * 100).toFixed(2)) : 0,
            unfavorable: total > 0 ? parseFloat(((unfavorable / total) * 100).toFixed(2)) : 0
          };
          
          processed.push({ 
            id: categoryId, 
            name: cat.name, 
            description: cat.description, 
            averageScore: avg, 
            questions: [],
            responseDistribution
          });
        });

        const overall = Array.from(categoryScores.values()).flat();
        setOverallAverageScore(overall.length ? overall.reduce((a, b) => a + b, 0) / overall.length : null);
        
        // Calculate overall distribution for pie chart
        const allScores = Array.from(scoresByQuestion.values()).flat();
        const overallFavorable = allScores.filter((s) => s >= 75).length;
        const overallNeutral = allScores.filter((s) => s >= 40 && s < 75).length;
        const overallUnfavorable = allScores.filter((s) => s < 40).length;
        const overallTotal = allScores.length;
        
        setOverallDistribution({
          favorable: overallFavorable,
          neutral: overallNeutral,
          unfavorable: overallUnfavorable,
          total: overallTotal
        });
        
        setProcessedCategories(processed.sort((a, b) => a.name.localeCompare(b.name)));

        // Load action plans with priority logic: partner first, then global as fallback
        const [partnerPlansRes, globalPlansRes] = await Promise.all([
          supabase
            .from("action_plans")
            .select("id,category_id,title,description,score_min,score_max,is_global,partner_id,show_in_report")
            .eq("is_global", false)
            .eq("partner_id", partnerId)
            .eq("show_in_report", true),
          supabase
            .from("action_plans")
            .select("id,category_id,title,description,score_min,score_max,is_global,partner_id,show_in_report")
            .eq("is_global", true)
            .eq("show_in_report", true)
        ]);

        const partnerPlans = partnerPlansRes.data || [];
        const globalPlans = globalPlansRes.data || [];

        // Group partner plans by category
        const partnerByCat: Record<string, any[]> = {};
        partnerPlans.forEach((p) => {
          const k = p.category_id || 'uncat';
          (partnerByCat[k] ||= []).push(p);
        });

        // Group global plans by category
        const globalByCat: Record<string, any[]> = {};
        globalPlans.forEach((p) => {
          const k = p.category_id || 'uncat';
          (globalByCat[k] ||= []).push(p);
        });

        // Build map of category average scores
        const catAvgMap = new Map<string, number>();
        processed.forEach(c => { catAvgMap.set(c.id, c.averageScore); });

        // Decide final plans per category: partner first; else global filtered by band
        const finalPlans: any[] = [];
        processed.forEach((cat) => {
          const k = cat.id;
          const partnerItems = partnerByCat[k] || [];
          if (partnerItems.length) {
            // Use partner plans
            finalPlans.push(...partnerItems.map(p => ({ ...p, categoryName: cat.name, categoryScore: cat.averageScore })));
          } else {
            // Use global plans filtered by score range
            const avg = catAvgMap.get(k);
            const globals = (globalByCat[k] || []).filter(g => {
              if (avg == null) return false;
              const min = typeof g.score_min === 'number' ? g.score_min : 0;
              const max = typeof g.score_max === 'number' ? g.score_max : 100;
              return avg >= min && avg <= max;
            });
            finalPlans.push(...globals.map(p => ({ ...p, categoryName: cat.name, categoryScore: cat.averageScore })));
          }
        });

        setGlobalActionPlans(finalPlans);

        const { data: apCats } = await supabase.from("action_plan_categories").select("id,name").order("name");
        setApCategories(apCats || []);
        
        // Keep existing apByCategory logic for other uses
        const byCat: Record<string, ActionPlan[]> = {};
        [...partnerPlans, ...globalPlans].forEach((item: any) => {
          const key = item.category_id || "uncategorized";
          if (!byCat[key]) byCat[key] = [];
          byCat[key].push(item);
        });
        setApByCategory(byCat);

      } catch (err: any) {
        console.error(err);
        showError("Erro ao carregar dados do relatório.");
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, partnerId]);

  const printToPdf = useCallback(async () => {
    const element = document.getElementById("report-content");
    if (!element) return;
    
    showSuccess("Gerando PDF... Aguarde.");
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `relatorio-${company?.name || "empresa"}-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: "mm", 
        format: "a4", 
        orientation: "portrait" 
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.print-break',
        avoid: '.avoid-break'
      }
    };
    try {
      await html2pdf().set(opt).from(element).save();
      showSuccess("PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      showError("Falha ao gerar o PDF. Tente novamente.");
    }
  }, [company]);

  const variablesHelp = useMemo(() => (
    <div className="text-sm text-muted-foreground space-y-1">
      <div><strong>Variáveis disponíveis</strong></div>
      <div>- {'{{empresa.nome}}'}</div>
      <div>- {'{{dataGeracao}}'}</div>
      <div>- {'{{pontuacaoGeral}}'}</div>
      <div>- {'{{categorias_resumo}}'} (bloco gerado)</div>
      <div>- {'{{categorias_detalhes}}'} (bloco gerado)</div>
    </div>
  ), []);

  if (!companyId) {
    return (
      <Card className="p-6"><div className="text-sm text-muted-foreground">Selecione uma empresa no topo para acessar o novo modelo.</div></Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6"><LoadingSpinner size={32} /><span className="ml-2 text-muted-foreground">Carregando...</span></div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 no-print">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Relatório Empresarial
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {company?.name} • Análise Completa
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={printToPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Gerar PDF
            </Button>
          </div>
        </div>

        <div id="report-content" className="space-y-8">
          
          {/* Logo do parceiro */}
          {partnerLogo && (
            <div className="flex justify-center mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
                <img src={partnerLogo} alt="Logo" className="max-w-[300px] max-h-[120px] object-contain" />
              </div>
            </div>
          )}

          {/* Título Principal Moderno - Usando configurações do parceiro */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 text-center" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              {reportConfig?.title || "Relatório de Fatores de Riscos Psicossociais"}
            </h1>
            <p className="text-lg text-slate-700 mb-4">
              {reportConfig?.subtitle || "NR-1, NR-17, Guia de Fatores Psicossociais, HSE-SIT, ISO 45003"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 font-medium">NR-1</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200 font-medium">NR-17</span>
              <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full border border-violet-200 font-medium">Guia Psicossocial</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 font-medium">HSE-SIT</span>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200 font-medium">ISO 45003</span>
            </div>
          </div>

        {/* Sumário Moderno - Agora vem imediatamente após o título */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200">
              <div className="w-6 h-6 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sumário</h2>
          </div>

          {/* Lista numerada de seções conforme sequência fornecida */}
          <div className="space-y-4">
            {/* Seção 1 - Identificação da Empresa */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
              <span className="text-slate-800 font-medium">Identificação da Empresa</span>
            </div>
            
            {/* Sub-seção 1.1 - Responsáveis Técnicos */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 ml-6">
              <div className="w-12 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1.1</div>
              <span className="text-slate-800 font-medium">Responsáveis Técnicos</span>
            </div>

            {/* Seção 2 - Escopo do Trabalho */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
              <span className="text-slate-800 font-medium">Escopo do Trabalho</span>
            </div>

            {/* Seção 3 - Fontes Técnicas */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
              <span className="text-slate-800 font-medium">Fontes Técnicas – Organizacionais</span>
            </div>

            {/* Seção 4 - Fontes Jurídicas */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">4</div>
              <span className="text-slate-800 font-medium">Fontes Jurídicas</span>
            </div>

            {/* Seção 5 - Metodologias */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">5</div>
              <span className="text-slate-800 font-medium">Metodologias de Avaliação</span>
            </div>

            {/* Seção 6 - Identificação dos riscos */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">6</div>
              <span className="text-slate-800 font-medium">Identificação dos riscos psicossociais</span>
            </div>

            {/* Seção 7 - Estratégias */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">7</div>
              <span className="text-slate-800 font-medium">Estratégias de Avaliação</span>
            </div>

            {/* Seção 8 - Análise do Resultado */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">8</div>
              <span className="text-slate-800 font-medium">Análise do Resultado</span>
            </div>

            {/* Seção 9 - Conclusão */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">9</div>
              <span className="text-slate-800 font-medium">Conclusão</span>
            </div>

            {/* Seção 10 - Considerações Finais */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">10</div>
              <span className="text-slate-800 font-medium">Considerações Finais</span>
            </div>

            {/* Anexos */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Anexos</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
                  <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">I</div>
                  <span className="text-slate-800 font-medium">Anexo I – Resultado das Avaliações</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
                  <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">II</div>
                  <span className="text-slate-800 font-medium">Anexo II – Análise e Inventário dos Riscos Psicossociais</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
                  <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">III</div>
                  <span className="text-slate-800 font-medium">Anexo III – Plano de Ação e Monitoramento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Identificação da Empresa - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.companyInfo !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center border border-emerald-200">
              <div className="w-6 h-6 text-emerald-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Identificação da Empresa</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            <div>
              <div className="text-muted-foreground">Razão Social</div>
              <div className="font-medium">{company?.name || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">CNPJ</div>
              <div className="font-medium">{(company as any)?.cnpj || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">CNAE</div>
              <div className="font-medium">{(company as any)?.cnae || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Endereço</div>
              <div className="font-medium">{formatAddress((company as any)?.address)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Setores</div>
              <div className="font-medium">{departmentNames || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Data da Avaliação</div>
              <div className="font-medium">{assessmentDateRange || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Grau de Risco</div>
              <div className="font-medium">
                {overallAverageScore !== null ? (
                  overallAverageScore < 40 ? (
                    <span className="text-red-600 font-bold">ELEVADO (Zona Vermelha)</span>
                  ) : overallAverageScore < 75 ? (
                    <span className="text-yellow-500 font-bold">MODERADO (Zona Amarela)</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">BAIXO (Zona Verde)</span>
                  )
                ) : "—"}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Responsáveis Técnicos - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.technicalResponsibles !== false) && primaryResponsible && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200">
              <div className="w-6 h-6 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.5 2.5 0 0 0 17.5 6H15v2h2.5c.28 0 .5.22.5.5s-.22.5-.5.5H14c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H16v2h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H16v2h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H16v2h2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H16v2h2c1.1 0 2 .9 2 2s-.9 2-2 2h-6v-2h-2v2h-2v-2H6v2H4v-2H2v-2h2v-6H2.5l2.54-7.63A2.5 2.5 0 0 1 6.5 10H9V8H6.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5H11c.55 0 1 .45 1 1v3.5c0 .83-.67 1.5-1.5 1.5H10v2h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H10v2h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H10v2h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H10V22h6c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2c1.1 0 2-.9 2-2z"/>
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Responsáveis Técnicos</h2>
              <p className="text-sm text-slate-600 mt-1">FRPRT (Fatores De Riscos Psicossociais Relacionados ao Trabalho)</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Nome</div>
              <div className="font-bold text-slate-900">{primaryResponsible?.name || '—'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Conselho</div>
              <div className="font-bold text-slate-900">{primaryResponsible?.council || '—'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Registro</div>
              <div className="font-bold text-slate-900">{primaryResponsible?.registration || '—'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contato</div>
              <div className="font-bold text-slate-900">{[primaryResponsible?.contact_email, primaryResponsible?.contact_phone].filter(Boolean).join(' | ') || '—'}</div>
            </div>
          </div>
        </div>
        )}

        {/* Escopo do Trabalho - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.scope !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center border border-purple-200">
              <div className="w-6 h-6 text-purple-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Escopo do Trabalho</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("escopo")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Fontes Técnicas – Organizacionais - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.technicalSources !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center border border-amber-200">
              <div className="w-6 h-6 text-amber-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M12,4A1,1 0 0,0 11,5V11A1,1 0 0,0 12,12A1,1 0 0,0 13,11V5A1,1 0 0,0 12,4M12,15A3,3 0 0,1 15,18V19H16V21H8V19H9V18A3,3 0 0,1 12,15M12,17A1,1 0 0,0 11,18V19H13V18A1,1 0 0,0 12,17Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Fontes Técnicas – Organizacionais</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("fontesTecnicas")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Fontes Jurídicas - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.legalSources !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-red-100 rounded-xl flex items-center justify-center border border-rose-200">
              <div className="w-6 h-6 text-rose-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A2,2 0 0,1 14,4V20A2,2 0 0,1 12,22A2,2 0 0,1 10,20V4A2,2 0 0,1 12,2M12,4A1,1 0 0,0 11,5V19A1,1 0 0,0 12,20A1,1 0 0,0 13,19V5A1,1 0 0,0 12,4Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Fontes Jurídicas</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("fontesJuridicas")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Metodologia de Avaliação - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.methodologies !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center border border-indigo-200">
              <div className="w-6 h-6 text-indigo-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Metodologia de Avaliação</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("metodologias")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Identificação dos Riscos Psicossociais - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.riskIdentification !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl flex items-center justify-center border border-red-200">
              <div className="w-6 h-6 text-red-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2L1,21H23M12,6L19.5,19H4.5M12,10L15.5,16H8.5"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Identificação dos Riscos Psicossociais</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("identificacaoRiscos")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Estratégias de Avaliação - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.strategies !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center border border-teal-200">
              <div className="w-6 h-6 text-teal-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Estratégias de Avaliação</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100" dangerouslySetInnerHTML={{ __html: getSection("estrategias")?.body || "" }}>
          </div>
        </div>
        )}

        {/* Análise do Resultado - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.resultAnalysis !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center border border-emerald-200">
              <div className="w-6 h-6 text-emerald-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21M16,8A2,2 0 0,0 18,6V4H20V2H16V4H14V6A2,2 0 0,0 16,8M16,5V6H18V4H16V5M6,8A2,2 0 0,0 8,6V4H10V2H6V4H4V6A2,2 0 0,0 6,8M6,5V6H8V4H6V5Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Análise do Resultado</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100">
            {getSection("analiseResultado")?.body}
          </div>
        </div>
        )}

        {/* Conclusão - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.conclusion !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center border border-violet-200">
                <div className="w-6 h-6 text-violet-600">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Conclusão</h2>
            </div>
            <button
              onClick={handleEditConclusion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium no-print"
            >
              Editar Conclusão
            </button>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100">
            {getSection("conclusao")?.body}
          </div>
        </div>
        )}

        {/* Considerações Finais - Card Moderno */}
        {(!reportConfig?.sections || reportConfig.sections.finalConsiderations !== false) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-gray-100 rounded-xl flex items-center justify-center border border-slate-200">
              <div className="w-6 h-6 text-slate-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Considerações Finais</h2>
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100">
            {getSection("consideracoes")?.body}
          </div>
        </div>
        )}

        {/* Anexo I - Resultado das Avaliações */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break mt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200">
              <div className="w-6 h-6 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3,3H21V21H3V3M5,5V19H19V5H5M7,7H17V9H7V7M7,11H17V13H7V11M7,15H17V17H7V15Z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Anexo I – Resultado das Avaliações</h2>
          </div>

          {/* Visão Geral - Gráfico de Pizza */}
          <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Visão Geral</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                {(() => {
                  const { favorable, neutral, unfavorable, total } = overallDistribution;
                  const favorablePercent = total > 0 ? (favorable / total) * 100 : 0;
                  const neutralPercent = total > 0 ? (neutral / total) * 100 : 0;
                  const unfavorablePercent = total > 0 ? (unfavorable / total) * 100 : 0;
                  
                  // Calculate overall average as the average of category averages
                  const overallAverage = processedCategories.length > 0
                    ? processedCategories.reduce((sum, cat) => sum + cat.averageScore, 0) / processedCategories.length
                    : 0;
                  
                  return (
                    <>
                      <svg viewBox="0 0 200 200" className="transform -rotate-90">
                        {/* Favorável - Verde */}
                        {favorablePercent > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="40"
                            strokeDasharray={`${favorablePercent * 5.027} ${100 * 5.027}`}
                            strokeDashoffset="0"
                          />
                        )}
                        {/* Neutro - Amarelo */}
                        {neutralPercent > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#ffd700"
                            strokeWidth="40"
                            strokeDasharray={`${neutralPercent * 5.027} ${100 * 5.027}`}
                            strokeDashoffset={`-${favorablePercent * 5.027}`}
                          />
                        )}
                        {/* Desfavorável - Vermelho */}
                        {unfavorablePercent > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="40"
                            strokeDasharray={`${unfavorablePercent * 5.027} ${100 * 5.027}`}
                            strokeDashoffset={`-${(favorablePercent + neutralPercent) * 5.027}`}
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-slate-900">{overallAverage.toFixed(2)}%</div>
                          <div className="text-sm text-slate-600">Média Geral</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-sm text-slate-700">
                  Favorável: {overallDistribution.favorable} ({overallDistribution.total > 0 ? ((overallDistribution.favorable / overallDistribution.total) * 100).toFixed(2) : '0.00'}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffd700' }}></div>
                <span className="text-sm text-slate-700">
                  Neutro: {overallDistribution.neutral} ({overallDistribution.total > 0 ? ((overallDistribution.neutral / overallDistribution.total) * 100).toFixed(2) : '0.00'}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-sm text-slate-700">
                  Desfavorável: {overallDistribution.unfavorable} ({overallDistribution.total > 0 ? ((overallDistribution.unfavorable / overallDistribution.total) * 100).toFixed(2) : '0.00'}%)
                </span>
              </div>
            </div>
          </div>

          {/* Legendas das Zonas de Risco */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#ffe5e5', borderColor: '#ef4444' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <h4 className="text-sm font-bold" style={{ color: '#dc2626' }}>Zona Vermelha (0% a 39,99%)</h4>
              </div>
              <p className="text-xs" style={{ color: '#b91c1c' }}>Risco elevado: ação corretiva imediata.</p>
            </div>
            <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#fff9e5', borderColor: '#ffd700' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffd700' }}></div>
                <h4 className="text-sm font-bold" style={{ color: '#ca8a04' }}>Zona Amarela (40% a 74,99%)</h4>
              </div>
              <p className="text-xs" style={{ color: '#a16207' }}>Atenção: possível risco psicossocial; revisar práticas.</p>
            </div>
            <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#e5ffe5', borderColor: '#22c55e' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <h4 className="text-sm font-bold" style={{ color: '#16a34a' }}>Zona Verde (75% a 100%)</h4>
              </div>
              <p className="text-xs" style={{ color: '#15803d' }}>Ambiente psicossocial satisfatório; manter boas práticas.</p>
            </div>
          </div>

          {/* Visão Geral Fatores - Gráfico de Barras Horizontais */}
          <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Visão Geral Fatores</h3>
            <div className="space-y-3">
              {processedCategories.map((category) => {
                const dist = category.responseDistribution || { favorable: 0, neutral: 0, unfavorable: 0 };
                return (
                  <div key={category.id} className="space-y-1">
                    <div className="text-sm font-medium text-slate-700">{category.name}</div>
                    <div className="flex h-8 rounded overflow-hidden border border-slate-200">
                      {dist.favorable > 0 && (
                        <div 
                          className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${dist.favorable}%` }}
                        >
                          {dist.favorable}%
                        </div>
                      )}
                      {dist.neutral > 0 && (
                        <div 
                          className="flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${dist.neutral}%`, backgroundColor: '#ffd700' }}
                        >
                          {dist.neutral}%
                        </div>
                      )}
                      {dist.unfavorable > 0 && (
                        <div 
                          className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${dist.unfavorable}%` }}
                        >
                          {dist.unfavorable}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Média Fatores - Gráfico de Barras Verticais */}
          <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Média Fatores</h3>
            <div className="relative border-b border-l border-slate-300 pb-2 pl-2">
              <div className="flex items-end justify-around gap-2" style={{ height: '240px' }}>
                {processedCategories
                  .sort((a, b) => b.averageScore - a.averageScore)
                  .map((category) => {
                    const value = category.averageScore; // Use 0-100 scale directly
                    // Height based on 0-100 scale: value/100 * 100%
                    const heightPercent = (value / 100) * 100;
                    return (
                      <div key={category.id} className="flex flex-col items-center gap-1 flex-1">
                        <div className="text-xs font-bold text-slate-700 h-4">{value.toFixed(2)}</div>
                        <div className="w-full flex items-end" style={{ height: '180px' }}>
                          <div 
                            className="w-full bg-green-500 rounded-t transition-all"
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-600 text-center leading-tight h-8 flex items-center justify-center">{category.name}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Render question sections dynamically by category */}
          {processedCategories.map((category) => {
            const categoryQuestions = processedQuestions
              .filter(q => q.category_id === category.id)
              .sort((a, b) => a.order - b.order);
            
            if (categoryQuestions.length === 0) return null;
            
            return (
              <React.Fragment key={category.id}>
                <div className="mb-4 bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Visão Fatores de {category.name}</h3>
                  <div className="space-y-2">
                    {categoryQuestions.map((question, idx) => {
                      const dist = question.responseDistribution;
                      return (
                        <div key={question.id} className="space-y-1">
                          <div className="text-xs text-slate-600">Q{idx + 1} - {question.text}</div>
                          <div className="flex h-6 rounded overflow-hidden border border-slate-200">
                            {dist.favorable > 0 && (
                              <div className="bg-green-500" style={{ width: `${dist.favorable}%` }}></div>
                            )}
                            {dist.neutral > 0 && (
                              <div style={{ width: `${dist.neutral}%`, backgroundColor: '#ffd700' }}></div>
                            )}
                            {dist.unfavorable > 0 && (
                              <div className="bg-red-500" style={{ width: `${dist.unfavorable}%` }}></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legendas das Zonas de Risco após cada categoria */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#ffe5e5', borderColor: '#ef4444' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                      <h4 className="text-sm font-bold" style={{ color: '#dc2626' }}>Zona Vermelha (0% a 39,99%)</h4>
                    </div>
                    <p className="text-xs" style={{ color: '#b91c1c' }}>Risco elevado: ação corretiva imediata.</p>
                  </div>
                  <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#fff9e5', borderColor: '#ffd700' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffd700' }}></div>
                      <h4 className="text-sm font-bold" style={{ color: '#ca8a04' }}>Zona Amarela (40% a 74,99%)</h4>
                    </div>
                    <p className="text-xs" style={{ color: '#a16207' }}>Atenção: possível risco psicossocial; revisar práticas.</p>
                  </div>
                  <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#e5ffe5', borderColor: '#22c55e' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                      <h4 className="text-sm font-bold" style={{ color: '#16a34a' }}>Zona Verde (75% a 100%)</h4>
                    </div>
                    <p className="text-xs" style={{ color: '#15803d' }}>Ambiente psicossocial satisfatório; manter boas práticas.</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

        </div>

        {/* Anexo II - Análise e Inventário dos Riscos Psicossociais */}
        <div className="report-section mb-8 bg-white rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Anexo II – Análise e Inventário dos Riscos Psicossociais</h2>
          
          <div className="mb-6 text-slate-700 leading-relaxed">
            <p>A análise foi realizada com base nas respostas obtidas pelo questionário Stress Indicator Tool (SIT), aplicado de forma anônima e individual. A interpretação seguiu os critérios de probabilidade x severidade, com apoio de análise estatística.</p>
          </div>

          {/* Tabela de Análise de Riscos */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-3 text-left text-sm font-bold text-slate-900">Fator Psicossocial Avaliado</th>
                  <th className="border border-slate-300 p-3 text-left text-sm font-bold text-slate-900">Classificação de Risco</th>
                  <th className="border border-slate-300 p-3 text-left text-sm font-bold text-slate-900">Observações Relevantes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Demandas: carga de trabalho, padrões de trabalho e ambiente</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">
                    <strong>Favorável:</strong> Indica boas condições de trabalho e aspectos positivos no ambiente organizacional.<br/>
                    Respostas possíveis:<br/>
                    Frequentemente e Sempre
                  </td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Sobrecarga frequente e prazos apertados.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Controle: autonomia sobre como o trabalho é realizado</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">
                    <strong>Neutro:</strong> Representa uma posição intermediária, sem uma inclinação clara para o positivo ou negativo.<br/>
                    Resposta possível: Às vezes
                  </td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Limitações em decisões operacionais.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Suporte: apoio da gestão e dos colegas</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">
                    <strong>Desfavorável:</strong> Aponta possíveis problemas que podem afetar a saúde, segurança e bem-estar dos funcionários.<br/>
                    Respostas possíveis:<br/>
                    Nunca e Raramente.
                  </td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Necessidade de maior escuta e feedback.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Relacionamentos: prevenção de conflitos e assédio</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700"></td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Interações colaborativas bem avaliadas.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Papel: clareza das funções e ausência de conflitos de responsabilidade</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700"></td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Dúvidas recorrentes sobre papéis e metas.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700">Mudanças: gestão e comunicação sobre mudanças organizacionais</td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700"></td>
                  <td className="border border-slate-300 p-3 text-sm text-slate-700"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Anexo III - Plano de Ação e Monitoramento */}
        <div className="report-section mb-8 bg-white rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Anexo III – Plano de Ação e Monitoramento</h2>
          
          <div className="mb-6 text-slate-700 leading-relaxed">
            <p>Este plano tem por objetivo monitorar e reduzir os riscos psicossociais mapeados, integrando ações ao <strong>PGR – Programa de Gerenciamento de Riscos, PCMSO – Programa de Controle Médico de Saúde Ocupacional, AEP – Análise Ergonômica Preliminar.</strong></p>
          </div>

          <div className="mb-6 text-slate-700 leading-relaxed">
            <p><strong>OBS:</strong> Este plano deverá ser revisado conforme o ciclo de revisão do PGR da empresa, ou sempre que ocorrerem alterações significativas nas condições de trabalho, organização ou identificação de novos riscos, conforme previsto na NR-01.</p>
          </div>

          {/* Tabela de Plano de Ação - Dinâmica baseada nos planos do parceiro ou globais */}
          {(() => {
            // Calculate overall average from categories
            const overallAverage = processedCategories.length > 0
              ? processedCategories.reduce((sum, cat) => sum + cat.averageScore, 0) / processedCategories.length
              : 0;
            
            // Show action plans if average is below 75
            const showActionPlan = overallAverage < 75;
            
            // Use globalActionPlans which already contains the priority logic applied
            const plansToShow = showActionPlan ? globalActionPlans : [];
            
            return (
              <div className="overflow-x-auto mb-6">
                {showActionPlan && plansToShow.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> A média geral da empresa está abaixo de 75% ({overallAverage.toFixed(2)}%). 
                      Os planos de ação abaixo são recomendações baseadas nas categorias com pontuação mais baixa.
                    </p>
                  </div>
                )}
                
                {showActionPlan && plansToShow.length > 0 ? (
                  <div className="space-y-6">
                    {plansToShow.map((plan, idx) => (
                      <div key={plan.id || idx} className="border border-slate-300 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-3 border-b border-slate-300">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900">{plan.categoryName}</h4>
                            <span className="text-xs text-slate-600">Média: {plan.categoryScore.toFixed(2)}% | Nível de Risco: {plan.categoryScore >= 75 ? 'Favorável' : plan.categoryScore >= 40 ? 'Neutro' : 'Desfavorável'}</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="text-sm font-semibold text-slate-800 mb-2">{plan.title}</h5>
                          <div className="text-sm text-slate-700 whitespace-pre-wrap">{plan.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : showActionPlan ? (
                  <div className="border border-slate-300 rounded-lg p-6 text-center text-sm text-slate-600">
                    <p className="font-semibold text-slate-700 mb-2">Nenhum plano de ação cadastrado</p>
                    <p>Entre em contato com o administrador para cadastrar planos de ação.</p>
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-lg p-6 text-center text-sm text-slate-600">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold text-slate-700">Média geral satisfatória ({overallAverage.toFixed(2)}%)</p>
                      <p>A empresa apresenta condições psicossociais favoráveis. Não há necessidade de planos de ação corretivos no momento.</p>
                      <p className="text-xs mt-2">Recomenda-se manter o monitoramento contínuo e as boas práticas atuais.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Seção de Assinaturas */}
        <div className="report-section mt-16 mb-8 bg-white rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Assinaturas</h2>
          
          <div className="grid md:grid-cols-2 gap-12 mt-12">
            {/* Assinatura do Responsável pela Empresa */}
            <div className="flex flex-col items-center">
              <div className="w-full border-t-2 border-slate-400 mb-3"></div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">{company?.name || 'Empresa'}</p>
                {company?.responsible_name && (
                  <p className="text-sm text-slate-700 mt-1">{company.responsible_name}</p>
                )}
                {company?.responsible_email && (
                  <p className="text-sm text-slate-600">{company.responsible_email}</p>
                )}
                <p className="text-sm text-slate-600 mt-1">Responsável pela Empresa</p>
              </div>
            </div>

            {/* Assinatura do Responsável Técnico Principal */}
            <div className="flex flex-col items-center">
              <div className="w-full border-t-2 border-slate-400 mb-3"></div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">
                  {primaryResponsible?.name || 'Responsável Técnico'}
                </p>
                {primaryResponsible?.profession && (
                  <p className="text-sm text-slate-600">{primaryResponsible.profession}</p>
                )}
                {primaryResponsible?.council && primaryResponsible?.registration && (
                  <p className="text-sm text-slate-600">
                    {primaryResponsible.council} - {primaryResponsible.registration}
                  </p>
                )}
                <p className="text-sm text-slate-600 mt-1">Responsável Técnico</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500">
            <p>Data: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        </div> {/* Fecha report-content */}
      </div>

      {/* Modal de Edição da Conclusão */}
      {editingConclusion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Editar Conclusão</h3>
              <p className="text-sm text-slate-600 mt-1">Personalize o texto da conclusão do relatório</p>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                value={conclusionText}
                onChange={(e) => setConclusionText(e.target.value)}
                className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Digite a conclusão personalizada..."
              />
              <p className="text-xs text-slate-500 mt-2">
                Este texto substituirá a conclusão padrão em todos os relatórios gerados.
              </p>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex items-center justify-between gap-4">
              <button
                onClick={handleResetConclusion}
                disabled={savingConclusion}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
              >
                Restaurar Padrão
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingConclusion(false)}
                  disabled={savingConclusion}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConclusion}
                  disabled={savingConclusion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {savingConclusion ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTemplateReport;
