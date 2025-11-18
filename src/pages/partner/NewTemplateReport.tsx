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

// Dados básicos já usados no Overview
type Company = { id: string; name: string; partner_id: string; cnpj?: string | null; cnae?: string | null; address?: string | null };
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
  const partnerId = (session as any)?.partner_id ?? (session as any)?.partnerId;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [overallAverageScore, setOverallAverageScore] = useState<number | null>(null);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);

  const [templateText, setTemplateText] = useState<string>(defaultTemplate);
  const [renderedText, setRenderedText] = useState<string>("");
  const [showEditor, setShowEditor] = useState<boolean>(false);
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
    "Resultado das Avaliações",
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
    { key: "escopo", title: "Escopo do Trabalho", body: "Este relatório integra as ações de avaliação das condições laborais, com ênfase na identificação e análise técnica dos fatores de riscos psicossociais presentes no ambiente de trabalho. Atende às diretrizes da NR-01, NR-17, Guia de Fatores Psicossociais (MTE), HSE-SIT e ISO 45003." },
    { key: "fontesTecnicas", title: "Fontes Técnicas – Organizacionais", body: "Condições de Trabalho: iluminação, ruído, mobiliário, ferramentas, EPIs.\n\nOrganização do Trabalho: metas, ritmo, pausas, autonomia, comunicação, sobrecarga." },
    { key: "fontesJuridicas", title: "Fontes Jurídicas", body: "NR-01 – Disposições Gerais (Portaria MTE nº 1.419/2024).\nNR-17 – Ergonomia (Portaria MTP nº 4.219/2022).\nISO 45003:2021 – Diretrizes internacionais para gestão de riscos psicossociais." },
    { key: "metodologias", title: "Metodologia de Avaliação", body: "Metodologia SIT (HSE Stress Indicator Tool), com 35 questões, avaliando seis fatores: Demandas, Controle, Suporte, Relacionamentos, Papel, Mudanças. Classificação: Favorável, Neutro, Desfavorável." },
    { key: "identificacaoRiscos", title: "Identificação dos Riscos Psicossociais", body: "Exemplos: sobrecarga de trabalho; baixa autonomia; assédio; metas inalcançáveis; comunicação deficiente; jornadas extensas; ambiente hostil; falta de apoio; insegurança no emprego." },
    { key: "estrategias", title: "Estratégias de Avaliação", body: "Aplicação de questionário online, individual e anônimo, garantindo confidencialidade e integridade das respostas." },
    { key: "analiseResultado", title: "Análise do Resultado", body: "Análise estatística das respostas e cruzamentos por categoria, interpretando variáveis psicossociais conforme normas técnicas e regulamentações legais." },
    { key: "conclusao", title: "Conclusão", body: "No momento da avaliação, os colaboradores não estão expostos a riscos psicossociais relevantes segundo NR-01 e NR-17. Recomenda-se acompanhamento contínuo e revisão de práticas." },
    { key: "consideracoes", title: "Considerações Finais", body: "Mudanças em processos, cargos ou condições de trabalho devem motivar reavaliação psicossocial conforme NR-01. Este relatório reflete as condições no momento da emissão." },
  ]);
  // Função auxiliar para criar cards de conteúdo modernos
  const ModernContentCard = ({ title, content, icon, iconBg = "from-blue-100 to-indigo-100", iconColor = "text-blue-600", borderColor = "border-blue-200" }: { 
    title: string; 
    content: string; 
    icon: string;
    iconBg?: string;
    iconColor?: string;
    borderColor?: string;
  }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 bg-gradient-to-br ${iconBg} rounded-xl flex items-center justify-center border ${borderColor}`}>
          <div className={`w-6 h-6 ${iconColor}`}>
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d={icon} />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      </div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-6 border border-slate-100">
        {content}
      </div>
    </div>
  );

  const getSection = (key: string) => sections.find(s => s.key === key) as ReportSection;
  const updateSection = (key: string, patch: Partial<ReportSection>) => {
    setSections(prev => prev.map(s => (s.key === key ? { ...s, ...patch } : s)));
  };
  const [departmentNames, setDepartmentNames] = useState<string>("");
  const [assessmentDateRange, setAssessmentDateRange] = useState<string>("");
  // DB Action Plans state
  const [apCategories, setApCategories] = useState<ActionPlanCategory[]>([]);
  const [apByCategory, setApByCategory] = useState<Record<string, ActionPlan[]>>({});
  const [primaryResponsible, setPrimaryResponsible] = useState<TechnicalResponsible | null>(null);
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string>("Valida NR1");

  const fmtPercent = (v?: number | null) => (typeof v === "number" ? `${v.toFixed(1)}%` : "—");
  const formatAddress = (addr: any): string => {
    if (!addr) return "—";
    if (typeof addr === 'string') return addr;
    try {
      const { street, number, neighborhood, city, state, zip, cep } = addr || {};
      const p1 = [street, number].filter(Boolean).join(", ");
      const p2 = neighborhood || "";
      const p3 = [city, state].filter(Boolean).join(" - ");
      const p4 = zip || cep ? `CEP ${zip || cep}` : "";
      return [p1, p2, p3, p4].filter(Boolean).join(" • ") || JSON.stringify(addr);
    } catch {
      return JSON.stringify(addr);
    }
  };

  const fetchData = useCallback(async () => {
    if (!companyId || !partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id,name,partner_id,cnpj,cnae,address")
        .eq("id", companyId)
        .maybeSingle();
      if (companyError) throw companyError;
      setCompany((companyData as Company) || null);

      // Fetch partner logo
      const { data: partnerData } = await supabase
        .from("partners")
        .select("logo_data_url")
        .eq("id", partnerId)
        .maybeSingle();
      setPartnerLogo(partnerData?.logo_data_url ?? null);

      // Fetch platform name
      const { data: platformData } = await supabase
        .from("platform_settings")
        .select("platform_name")
        .limit(1)
        .maybeSingle();
      setPlatformName(platformData?.platform_name || "Valida NR1");

      // Fetch technical responsible: company-level primary first; fallback to partner-level primary
      let tr: TechnicalResponsible | null = null;
      {
        const { data, error } = await supabase
          .from('technical_responsibles')
          .select('id,partner_id,company_id,is_primary,name,council,registration,profession,contact_email,contact_phone')
          .eq('partner_id', partnerId)
          .eq('company_id', companyId)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error as any;
        if (data) tr = data as TechnicalResponsible;
      }
      if (!tr) {
        const { data, error } = await supabase
          .from('technical_responsibles')
          .select('id,partner_id,company_id,is_primary,name,council,registration,profession,contact_email,contact_phone')
          .eq('partner_id', partnerId)
          .is('company_id', null)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error as any;
        if (data) tr = data as TechnicalResponsible;
      }
      setPrimaryResponsible(tr);

      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from("assessments")
        .select("id,company_id,score,created_at")
        .eq("company_id", companyId)
        .eq("partner_id", partnerId);
      if (assessmentsError) throw assessmentsError;
      const assessments = (assessmentsData as any[]) || [];
      const valid = assessments.filter(a => typeof a.score === "number");
      const total = valid.reduce((s, a) => s + (a.score || 0), 0);
      const avgOverall = valid.length ? total / valid.length : null;
      setOverallAverageScore(avgOverall);

      if (assessments.length) {
        const dates = assessments.map(a => new Date(a.created_at)).filter(d => !isNaN(d.getTime()));
        if (dates.length) {
          const minD = new Date(Math.min.apply(null, dates as unknown as number[]));
          const maxD = new Date(Math.max.apply(null, dates as unknown as number[]));
          const same = minD.toDateString() === maxD.toDateString();
          setAssessmentDateRange(same ? maxD.toLocaleDateString("pt-BR") : `${minD.toLocaleDateString("pt-BR")} - ${maxD.toLocaleDateString("pt-BR")}`);
        }
      }

      // Perguntas / categorias / respostas para compor médias por categoria
      const assessmentIds = assessments.map(a => a.id);
      if (!assessmentIds.length) {
        setProcessedCategories([]);
        return;
      }
      const [resResponses, resQuestions, resCategories, resDepts] = await Promise.all([
        supabase.from("assessment_responses").select("assessment_id,question_id,answer_value,scored_value").in("assessment_id", assessmentIds),
        supabase.from("questions").select("id,category_id,text,kind,order").eq("status", "active"),
        supabase.from("question_categories").select("id,name,description,order").eq("status", "active"),
        supabase.from("departments").select("id,name").eq("company_id", companyId),
      ]);
      const responses = (resResponses.data as any[]) || [];
      const questions = (resQuestions.data as any[]) || [];
      const categories = (resCategories.data as any[]) || [];
      const depts = (resDepts.data as any[]) || [];
      if (depts.length) setDepartmentNames(depts.map(d => d.name).join(", "));

      const responsesByQuestionId = responses.reduce((acc: Record<string, any[]>, r) => {
        (acc[r.question_id] ||= []).push(r);
        return acc;
      }, {});

      const processedQuestions = questions.map((q: any) => {
        const list = responsesByQuestionId[q.id] || [];
        if (!list.length) return { id: q.id, text: q.text, order: q.order, category_id: q.category_id, averageScore: 0, responseDistribution: { favorable: 0, neutral: 0, unfavorable: 0 } };
        let scoreSum = 0, fav = 0, neu = 0, unf = 0;
        list.forEach((r) => {
          scoreSum += r.scored_value;
          if (r.scored_value >= 75) fav++; else if (r.scored_value >= 40) neu++; else unf++;
        });
        const totalR = list.length;
        return {
          id: q.id,
          text: q.text,
          order: q.order,
          category_id: q.category_id,
          averageScore: scoreSum / totalR,
          responseDistribution: {
            favorable: (fav / totalR) * 100,
            neutral: (neu / totalR) * 100,
            unfavorable: (unf / totalR) * 100,
          },
        } as ProcessedQuestion;
      });

      const byCat: Record<string, ProcessedQuestion[]> = {};
      processedQuestions.forEach((pq) => {
        const cid = pq.category_id || "no-category";
        (byCat[cid] ||= []).push(pq);
      });

      const mapCatOrder = new Map(categories.map((c: any) => [c.id, c.order ?? 0]));
      const cats: ProcessedCategory[] = categories
        .map((c: any) => {
          const qs = (byCat[c.id] || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          let scoreSum = 0, count = 0;
          qs.forEach((q) => {
            const qResp = responsesByQuestionId[q.id] || [];
            if (qResp.length) {
              scoreSum += qResp.reduce((s, r) => s + r.scored_value, 0);
              count += qResp.length;
            }
          });
          const avg = count ? scoreSum / count : 0;
          return { id: c.id, name: c.name, description: c.description, averageScore: avg, questions: qs };
        })
        .sort((a, b) => (mapCatOrder.get(a.id)! - mapCatOrder.get(b.id)!));

      setProcessedCategories(cats);

      // Load Action Plans from DB (Partner > Global; filter show_in_report and score range)
      const [catsRes, partnerRes, globalRes] = await Promise.all([
        supabase
          .from('question_categories')
          .select('id,name')
          .order('name', { ascending: true }),
        supabase
          .from('action_plans')
          .select('id,category_id,description,is_global,partner_id,show_in_report,score_min,score_max')
          .eq('is_global', false)
          .eq('partner_id', partnerId)
          .eq('show_in_report', true),
        supabase
          .from('action_plans')
          .select('id,category_id,description,is_global,partner_id,show_in_report,score_min,score_max')
          .eq('is_global', true)
          .eq('show_in_report', true),
      ]);
      if (catsRes.error || partnerRes.error || globalRes.error) {
        throw catsRes.error || partnerRes.error || globalRes.error;
      }
      
      const catsDb = (catsRes.data as ActionPlanCategory[]) || [];
      const partnerByCat: Record<string, ActionPlan[]> = {};
      ((partnerRes.data as ActionPlan[]) || []).forEach((p) => {
        const k = p.category_id || 'uncat';
        (partnerByCat[k] ||= []).push(p);
      });
      
      const globalByCat: Record<string, ActionPlan[]> = {};
      ((globalRes.data as ActionPlan[]) || []).forEach((p) => {
        const k = p.category_id || 'uncat';
        (globalByCat[k] ||= []).push(p);
      });
      
      // Build map of category average scores
      const catAvgMap = new Map<string, number>();
      cats.forEach(c => { catAvgMap.set(c.id, c.averageScore); });
      
      // Decide final plans per category: partner first; else global filtered by score band
      const finalByCat: Record<string, ActionPlan[]> = {};
      catsDb.forEach((c) => {
        const k = c.id;
        const partnerItems = partnerByCat[k] || [];
        if (partnerItems.length) {
          finalByCat[k] = partnerItems;
        } else {
          const avg = catAvgMap.get(k);
          const globals = (globalByCat[k] || []).filter(g => {
            if (avg == null) return false;
            const min = typeof g.score_min === 'number' ? g.score_min : 0;
            const max = typeof g.score_max === 'number' ? g.score_max : 100;
            return avg >= min && avg <= max;
          });
          finalByCat[k] = globals;
        }
      });
      
      // Show only categories that have plans to display
      const catsWithPlans = catsDb.filter(c => (finalByCat[c.id] || []).length > 0);
      setApCategories(catsWithPlans);
      setApByCategory(finalByCat);
    } catch (e) {
      console.error("[NewTemplateReport] Erro ao carregar dados:", e);
      showError("Falha ao carregar dados para o modelo de relatório.");
    } finally {
      setLoading(false);
    }
  }, [companyId, partnerId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (company) preview(); }, [company, overallAverageScore, processedCategories]);

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

  const replaceAllCompat = (src: string, find: string, replacement: string) => src.split(find).join(replacement);

  const buildContextBlocks = () => {
    const resumo = processedCategories.map(c => `- ${c.name}: ${fmtPercent(c.averageScore)}`).join("\n");
    const detalhes = processedCategories.map(c => {
      const qs = c.questions.map(q => `  • ${(q.order ?? "-")}. ${q.text} — Média: ${fmtPercent(q.averageScore)} (Fav ${q.responseDistribution.favorable.toFixed(0)}% | Neut ${q.responseDistribution.neutral.toFixed(0)}% | Desf ${q.responseDistribution.unfavorable.toFixed(0)}%)`).join("\n");
      return `Categoria: ${c.name} (${fmtPercent(c.averageScore)})\n${qs}`;
    }).join("\n\n");
    return { resumo, detalhes };
  };

  const preview = () => {
    if (!company) { showError("Empresa não encontrada." ); return; }
    const { resumo, detalhes } = buildContextBlocks();
    const text = [
      ["{{empresa.nome}}", company.name],
      ["{{dataGeracao}}", new Date().toLocaleString("pt-BR")],
      ["{{pontuacaoGeral}}", fmtPercent(overallAverageScore)],
      ["{{categorias_resumo}}", resumo],
      ["{{categorias_detalhes}}", detalhes],
    ].reduce((acc, [k, v]) => replaceAllCompat(acc, k as string, v as string), templateText);
    setRenderedText(text);
  };

  const printToPdf = async () => {
    try {
      // Garante que o preview foi executado
      if (!renderedText) { 
        preview(); 
        // Aguarda um momento para o DOM atualizar
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const node = document.getElementById('report-content');
      if (!node) { 
        showError('Conteúdo do relatório não encontrado.'); 
        return; 
      }

      showSuccess('Gerando PDF... Aguarde.');

      // Clone o elemento para não afetar a página
      const clone = node.cloneNode(true) as HTMLElement;
      
      // Remove elementos que não devem aparecer no PDF
      clone.querySelectorAll('.no-print').forEach(el => el.remove());

      // Configurações do html2pdf com cores preservadas
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Relatorio_Completo_${company?.name || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: '#ffffff',
          windowWidth: 1200,
          windowHeight: 1600
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.print-break',
          avoid: '.avoid-break'
        }
      };

      // Gera e faz download do PDF
      await html2pdf().set(opt).from(clone).save();
      
      showSuccess('PDF gerado com sucesso!');
    } catch (e) {
      console.error('Falha ao gerar PDF:', e);
      showError('Falha ao gerar o PDF. Tente novamente.');
    }
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
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
              variant="outline" 
              onClick={() => setShowEditor((v) => !v)} 
              className="border-slate-200 hover:border-slate-300 hover:bg-white/50 backdrop-blur-sm transition-all duration-200 no-print"
            >
              {showEditor ? "Ocultar Editor" : "Editar Conteúdo"}
            </Button>
            <Button 
              onClick={printToPdf}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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

          <div className="space-y-8">
          {/* Título Principal Moderno */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4">
              Relatório de Fatores de Riscos Psicossociais
            </h1>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 font-medium">NR-1</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-200 font-medium">NR-17</span>
              <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full border border-violet-200 font-medium">Guia Psicossocial</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200 font-medium">HSE-SIT</span>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200 font-medium">ISO 45003</span>
            </div>
          </div>
        </div>

        {/* Sumário Moderno */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border border-blue-200">
              <div className="w-6 h-6 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sumário Executivo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tocItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Identificação da Empresa - Card Moderno */}
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
          </div>
        </div>

        {/* Responsáveis Técnicos - Card Moderno */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8 avoid-break">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center border border-violet-200">
              <div className="w-6 h-6 text-violet-600">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Responsáveis Técnicos</h2>
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

        {/* Escopo - Card Moderno */}
        <ModernContentCard 
          title={getSection("escopo").title}
          content={getSection("escopo").body}
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />

        {/* Conteúdo Narrativo Dinâmico - Card Moderno */}
        {renderedText && (
          <ModernContentCard 
            title="Conteúdo Narrativo"
            content={renderedText}
            icon="M11 5h2v14h-2zm6 2h2v10h-2zm-12 4h2v6H5z"
            iconBg="from-green-100 to-emerald-100"
            iconColor="text-green-600"
            borderColor="border-green-200"
          />
        )}

        {/* Fontes Técnicas - Card Moderno */}
        <ModernContentCard 
          title={getSection("fontesTecnicas").title}
          content={getSection("fontesTecnicas").body}
          icon="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
          iconBg="from-slate-100 to-gray-100"
          iconColor="text-slate-600"
          borderColor="border-slate-200"
        />

        {/* Fontes Jurídicas - Card Moderno */}
        <ModernContentCard 
          title={getSection("fontesJuridicas").title}
          content={getSection("fontesJuridicas").body}
          icon="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
          iconBg="from-red-100 to-rose-100"
          iconColor="text-red-600"
          borderColor="border-red-200"
        />

        {/* Metodologias - Card Moderno */}
        <ModernContentCard 
          title={getSection("metodologias").title}
          content={getSection("metodologias").body}
          icon="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
          iconBg="from-purple-100 to-violet-100"
          iconColor="text-purple-600"
          borderColor="border-purple-200"
        />

        {/* Identificação de Riscos - Card Moderno */}
        <ModernContentCard 
          title={getSection("identificacaoRiscos").title}
          content={getSection("identificacaoRiscos").body}
          icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          iconBg="from-orange-100 to-amber-100"
          iconColor="text-orange-600"
          borderColor="border-orange-200"
        />

        {/* Estratégias - Card Moderno */}
        <ModernContentCard 
          title={getSection("estrategias").title}
          content={getSection("estrategias").body}
          icon="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          iconBg="from-green-100 to-emerald-100"
          iconColor="text-green-600"
          borderColor="border-green-200"
        />

        {/* Análise do Resultado - Card Moderno */}
        <ModernContentCard 
          title={getSection("analiseResultado").title}
          content={getSection("analiseResultado").body}
          icon="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
          iconBg="from-indigo-100 to-blue-100"
          iconColor="text-indigo-600"
          borderColor="border-indigo-200"
        />

        {/* Conclusão - Card Moderno */}
        <ModernContentCard 
          title={getSection("conclusao").title}
          content={getSection("conclusao").body}
          icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          iconBg="from-teal-100 to-cyan-100"
          iconColor="text-teal-600"
          borderColor="border-teal-200"
        />

        {/* Considerações Finais - Card Moderno */}
        <ModernContentCard 
          title={getSection("consideracoes").title}
          content={getSection("consideracoes").body}
          icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          iconBg="from-cyan-100 to-sky-100"
          iconColor="text-cyan-600"
          borderColor="border-cyan-200"
        />

        {/* Indicadores por Categoria - Design Moderno */}
        <div className="space-y-6 print-break avoid-break">
          <h2 className="text-2xl font-bold text-slate-900">Indicadores por Categoria</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {processedCategories.map((c) => {
              const v = c.averageScore || 0;
              const tone = v >= 75 ? "from-emerald-500 to-teal-600" : v >= 40 ? "from-amber-500 to-orange-600" : "from-rose-500 to-red-600";
              const sub = v >= 75 ? "Adequado" : v >= 40 ? "Neutro" : "Crítico";
              const iconColor = v >= 75 ? "text-emerald-200" : v >= 40 ? "text-amber-200" : "text-rose-200";
              return (
                <div key={c.id} className={`bg-gradient-to-br ${tone} rounded-2xl text-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <div className={`w-6 h-6 ${iconColor}`}>
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{fmtPercent(v)}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">{c.name}</div>
                    <div className="text-sm opacity-90 font-medium">{sub}</div>
                  </div>
                  {/* Barra de progresso animada */}
                  <div className="mt-4">
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${v}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhes por Categoria - Design Moderno */}
        <div className="space-y-8 print-break">
          {processedCategories.map((c) => (
            <div key={c.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden avoid-break">
              <div className="p-8">
                {/* Header da Categoria */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border border-slate-200">
                      <div className="w-7 h-7 text-slate-600">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{c.name}</h2>
                      <p className="text-sm text-slate-500 font-medium">
                        {c.questions.length} questão{c.questions.length !== 1 ? 'ões' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 font-medium mb-1">Média da Categoria</div>
                    <div className="text-3xl font-bold text-slate-900">{fmtPercent(c.averageScore)}</div>
                  </div>
                </div>

                {/* Questões */}
                <div className="space-y-6">
                  {c.questions.map((q, index) => (
                    <div key={q.id} className={`group transition-all duration-200 ${
                      index > 0 ? 'pt-6 border-t border-slate-100' : ''
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0 mt-1">
                          <span className="text-sm font-bold text-slate-600">{(q.order ?? "-")}</span>
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3 leading-relaxed">
                              {q.text}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Favorável</p>
                                </div>
                                <p className="text-lg font-bold text-emerald-800">{q.responseDistribution.favorable.toFixed(0)}%</p>
                              </div>
                              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Neutro</p>
                                </div>
                                <p className="text-lg font-bold text-amber-800">{q.responseDistribution.neutral.toFixed(0)}%</p>
                              </div>
                              <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Desfavorável</p>
                                </div>
                                <p className="text-lg font-bold text-rose-800">{q.responseDistribution.unfavorable.toFixed(0)}%</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Barra de Distribuição Moderna */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-slate-600">Distribuição de Respostas</span>
                              <span className="text-sm font-bold text-slate-700">Média: {fmtPercent(q.averageScore)}</span>
                            </div>
                            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                              <div 
                                className="h-full bg-emerald-500 rounded-l-full transition-all duration-700 ease-out"
                                style={{ width: `${q.responseDistribution.favorable}%` }}
                              />
                              <div 
                                className="h-full bg-amber-400 transition-all duration-700 ease-out"
                                style={{ width: `${q.responseDistribution.neutral}%` }}
                              />
                              <div 
                                className="h-full bg-rose-500 rounded-r-full transition-all duration-700 ease-out"
                                style={{ width: `${q.responseDistribution.unfavorable}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plano de Ação Moderno (only if overall score < 75) */}
        {overallAverageScore !== null && overallAverageScore < 75 && apCategories.length > 0 && (
          <div className="space-y-6 print-break">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center border border-red-200">
                  <div className="w-7 h-7 text-red-600">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Plano de Ação e Monitoramento</h3>
                  <p className="text-sm text-slate-600 font-medium">Anexo III • Ações recomendadas para melhoria</p>
                </div>
              </div>
              
              <div className="space-y-8">
                {apCategories.map((cat) => {
                  const items = apByCategory[cat.id] || [];
                  if (!items.length) return null;
                  const catAvg = processedCategories.find(c => c.id === cat.id)?.averageScore ?? null;
                  const risk = (() => {
                    if (catAvg === null) return { label: 'Sem dados', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
                    if (catAvg < 40) return { label: 'Risco Elevado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
                    if (catAvg < 75) return { label: 'Risco Moderado', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
                    return { label: 'Risco Baixo', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
                  })();
                  return (
                    <div key={cat.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-xl font-bold text-slate-900">{cat.name}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            <span className="font-medium">Média:</span> {typeof catAvg==='number' ? catAvg.toFixed(1) : '—'}% • 
                            <span className={`font-semibold ${risk.color}`}>{risk.label}</span>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${risk.bg} ${risk.color} ${risk.border} border`}>
                          {risk.label}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {items.map((item, idx) => (
                          <div key={item.id} className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200 flex-shrink-0">
                                <span className="text-sm font-bold text-blue-600">{idx + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-slate-900 mb-2">Ação {idx + 1}</div>
                                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.description}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Moderno */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 inline-block">
            <div className="text-sm font-semibold text-slate-700 mb-1">
              Relatório gerado por <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{platformName}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Sistema de Avaliação de Riscos Psicossociais</div>
            <div className="mt-3 flex justify-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

export default NewTemplateReport;
