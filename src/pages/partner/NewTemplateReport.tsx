import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Novo Modelo de Relatório — {company?.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setShowEditor((v) => !v)} className="no-print">{showEditor ? "Ocultar Editor" : "Editar Conteúdo"}</Button>
          <Button onClick={printToPdf}>Gerar PDF</Button>
        </div>
      </div>

      <div id="report-content" className="space-y-6">
        

        {/* Logo do parceiro */}
        {partnerLogo && (
          <div className="flex justify-center mb-6">
            <img src={partnerLogo} alt="Logo" className="max-w-[300px] max-h-[120px] object-contain" />
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS RELACIONADOS AO TRABALHO</h1>
          <div className="text-sm text-muted-foreground">NR-1, NR-17, Guia de Fatores Psicossociais, HSE-SIT, ISO 45003</div>
        </div>

        <Card className="p-4">
          <div className="text-lg font-semibold mb-2">Sumário</div>
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            {tocItems.map((item, idx) => (<li key={idx}>{item}</li>))}
          </ol>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">1. Identificação da Empresa</div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
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
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">1.1. Responsáveis técnicos pelas avaliações</div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <div className="text-muted-foreground">Nome</div>
              <div className="font-medium">{primaryResponsible?.name || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Conselho</div>
              <div className="font-medium">{primaryResponsible?.council || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Registro</div>
              <div className="font-medium">{primaryResponsible?.registration || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Contato</div>
              <div className="font-medium">{[primaryResponsible?.contact_email, primaryResponsible?.contact_phone].filter(Boolean).join(' | ') || '—'}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("escopo").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("escopo").body}</div>
        </Card>

        {/* Conteúdo Narrativo Dinâmico */}
        {renderedText && (
          <Card className="p-4 avoid-break">
            <div className="text-lg font-semibold mb-3">Conteúdo Narrativo</div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{renderedText}</div>
          </Card>
        )}

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("fontesTecnicas").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("fontesTecnicas").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("fontesJuridicas").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("fontesJuridicas").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("metodologias").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("metodologias").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("identificacaoRiscos").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("identificacaoRiscos").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("estrategias").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("estrategias").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("analiseResultado").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("analiseResultado").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("conclusao").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("conclusao").body}</div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">{getSection("consideracoes").title}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{getSection("consideracoes").body}</div>
        </Card>

        <div className="space-y-3 print-break avoid-break">
          <h2 className="text-xl font-semibold">Indicadores por Categoria</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {processedCategories.map((c) => {
              const v = c.averageScore || 0;
              const tone = v >= 75 ? "bg-emerald-600" : v >= 40 ? "bg-amber-500" : "bg-rose-600";
              const sub = v >= 75 ? "Adequado" : v >= 40 ? "Neutro" : "Crítico";
              return (
                <div key={c.id} className={`rounded-xl text-white p-4 ${tone}`}>
                  <div className="text-sm opacity-90">{c.name}</div>
                  <div className="text-2xl font-bold">{fmtPercent(v)}</div>
                  <div className="text-xs opacity-90">{sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 print-break">
          {processedCategories.map((c) => (
            <Card key={c.id} className="p-4 avoid-break">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Categoria</div>
                  <div className="text-lg font-semibold">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Média</div>
                  <div className="text-xl font-bold">{fmtPercent(c.averageScore)}</div>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {c.questions.map((q) => (
                  <div key={q.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{(q.order ?? "-")}.</span> {q.text}
                      </div>
                      <div className="ml-4 text-sm font-semibold whitespace-nowrap">
                        {fmtPercent(q.averageScore)}
                      </div>
                    </div>
                    <div>
                      <div className="h-4 w-full bg-muted rounded overflow-hidden flex">
                        <div className="h-4 bg-emerald-500" style={{ width: `${q.responseDistribution.favorable.toFixed(0)}%` }} />
                        <div className="h-4 bg-amber-400" style={{ width: `${q.responseDistribution.neutral.toFixed(0)}%` }} />
                        <div className="h-4 bg-rose-500" style={{ width: `${q.responseDistribution.unfavorable.toFixed(0)}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Fav {q.responseDistribution.favorable.toFixed(0)}% • Neut {q.responseDistribution.neutral.toFixed(0)}% • Desf {q.responseDistribution.unfavorable.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Plano de Ação (only if overall score < 75) */}
        {overallAverageScore !== null && overallAverageScore < 75 && apCategories.length > 0 && (
          <div className="space-y-4 print-break">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Anexo III – Plano de Ação e Monitoramento</h3>
              {apCategories.map((cat) => {
                const items = apByCategory[cat.id] || [];
                if (!items.length) return null;
                const catAvg = processedCategories.find(c => c.id === cat.id)?.averageScore ?? null;
                const risk = (() => {
                  if (catAvg === null) return { label: 'Sem dados', color: 'text-slate-500' };
                  if (catAvg < 40) return { label: 'Risco Elevado (Zona Vermelha)', color: 'text-red-600' };
                  if (catAvg < 75) return { label: 'Risco Moderado (Zona Amarela)', color: 'text-amber-600' };
                  return { label: 'Risco Baixo (Zona Verde)', color: 'text-green-600' };
                })();
                return (
                  <div key={cat.id} className="mb-6 avoid-break">
                    <div className="mb-3">
                      <div className="font-semibold text-lg">{cat.name}</div>
                      <div className="text-sm text-slate-700 mt-1">
                        <span className="font-medium">Média:</span> {typeof catAvg==='number' ? catAvg.toFixed(1) : '—'}% • <span className={`font-medium ${risk.color}`}>{risk.label}</span>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-slate-700">
                      {items.map((item, idx) => (
                        <div key={item.id} className="pl-4 border-l-2 border-slate-300">
                          <div className="font-medium text-slate-900 mb-1">Ação {idx + 1}:</div>
                          <div className="whitespace-pre-line leading-relaxed">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Nome da plataforma no final */}
        <div className="mt-8 pt-6 border-t text-center text-muted-foreground">
          <div className="text-[10px]">Relatório gerado por <span className="font-semibold">{platformName}</span></div>
          <div className="text-[9px] mt-0.5">Sistema de Avaliação de Riscos Psicossociais</div>
        </div>
      </div>
    </div>
  );
};

export default NewTemplateReport;
