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
            <li>Identificação da Empresa</li>
            <li>Responsáveis Técnicos</li>
            <li>Escopo do Trabalho</li>
            <li>Fontes Técnicas – Organizacionais</li>
            <li>Fontes Jurídicas</li>
            <li>Metodologia de Avaliação</li>
            <li>Identificação dos riscos psicossociais</li>
            <li>Estratégias de Avaliação</li>
            <li>Análise do Resultado</li>
            <li>Resultado das Avaliações</li>
            <li>Conclusão</li>
            <li>Considerações Finais</li>
            <li>Anexo I – Resultado das Avaliações</li>
            <li>Anexo II – Análise e Inventário</li>
            <li>Anexo III – Plano de Ação e Monitoramento</li>
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
          <div className="text-lg font-semibold mb-3">2. Escopo do Trabalho</div>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Este relatório de fatores de riscos psicossociais relacionados ao trabalho integra as ações de avaliação das condições laborais dos colaboradores, com ênfase na identificação e análise técnica dos fatores de riscos psicossociais presentes no ambiente de trabalho. Seu objetivo é contribuir para a promoção da saúde mental, bem-estar e produtividade dos trabalhadores, bem como para o cumprimento da legislação vigente.
            </p>
            <p>
              O relatório de fatores de riscos psicossociais relacionados ao trabalho em conformidade com as diretrizes da NR-01, atualizada pela Portaria MTE nº 1.419/2024 e vigente a partir de maio de 2026, que passou a integrar de forma formal os fatores psicossociais ao Gerenciamento de Riscos Ocupacionais (GRO). Também atende à NR-17, ao Guia de Informações sobre Fatores Psicossociais Relacionados ao Trabalho (MTE), às recomendações da HSE-SIT (Health and Safety Executive) e à norma internacional ISO 45003, assegurando alinhamento com as melhores práticas nacionais e internacionais em Saúde e Segurança do Trabalho.
            </p>
            <div className="font-semibold">Além de atender aos requisitos legais, este relatório oferece subsídios técnicos fundamentados para decisões estratégicas no âmbito do Programa de Gerenciamento de Riscos (PGR), como:</div>
            <ul className="list-disc ml-6 space-y-1">
              <li>Aprofundamento das análises por meio de Análise Ergonômica do Trabalho (AEP/AET), quando aplicável;</li>
              <li>Priorização de medidas de prevenção e controle;</li>
              <li>Definição de planos de ação alinhados ao PGR voltados à construção de ambientes de trabalho mais seguros, saudáveis e produtivos.</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">3. Fontes Técnicas – Organizacionais</div>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <div className="font-semibold">Condições de Trabalho</div>
            <p>
              Aspectos relacionados ao ambiente físico e aos recursos disponíveis, incluindo iluminação inadequada, níveis de ruído excessivos, mobiliário e ferramentas desatualizados ou inadequados, e a falta ou inadequação de Equipamentos de Proteção Individual (EPIs).
            </p>
            <div className="font-semibold">Organização do Trabalho</div>
            <p>
              Fatores relacionados à estrutura e gestão do trabalho, como a imposição de metas irrealistas, ritmo de trabalho excessivo, ausência de pausas suficientes, falta de autonomia nas funções, falhas na comunicação interna e sobrecarga de tarefas.
            </p>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">5. Fontes Jurídicas</div>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <div className="font-semibold">NR-01: Disposições Gerais</div>
            <p>
              Portaria MTE nº 1.419/2024, que estabelece as diretrizes gerais para o gerenciamento de riscos ocupacionais, incluindo a identificação e controle de riscos psicossociais no ambiente de trabalho.
            </p>
            <div className="font-semibold">NR-17: Ergonomia</div>
            <p>
              Portaria MTP nº 4.219/2022, que regula as condições ergonômicas no ambiente laboral, abrangendo aspectos relacionados ao conforto, segurança e saúde física e mental dos trabalhadores.
            </p>
            <div className="font-semibold">ISO 45003:2021</div>
            <p>
              Diretrizes internacionais para a gestão de riscos psicossociais na saúde e segurança ocupacional, oferecendo abordagens práticas para identificar, avaliar e mitigar fatores que afetam o bem-estar mental no trabalho.
            </p>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">6. Metodologias de Avaliação</div>
          <div className="space-y-4 text-sm leading-relaxed text-slate-700">
            <p>
              Metodologia <span className="font-semibold">SIT - HSE Stress Indicator Tool</span>, integrada à PLATAFORMA. A ferramenta traz uma pesquisa para identificar e mensurar os riscos psicossociais, com trinta e cinco perguntas que abordam áreas principais de trabalho que, se não gerenciadas adequadamente, são conhecidas por serem causas potenciais de estresse no local de trabalho.
            </p>

            

            <div className="space-y-2">
              <div className="font-semibold">I. Coleta de Dados</div>
              <div>Os Colaboradores respondem a um questionário que avaliam seis fatores críticos do ambiente de trabalho:</div>
              <ul className="list-disc ml-6 space-y-1">
                <li><span className="font-medium">Demandas</span>: carga de trabalho, padrões de trabalho e ambiente</li>
                <li><span className="font-medium">Controle</span>: autonomia sobre como o trabalho é realizado</li>
                <li><span className="font-medium">Suporte</span>: apoio da gestão e dos colegas</li>
                <li><span className="font-medium">Relacionamentos</span>: prevenção de conflitos e assédio</li>
                <li><span className="font-medium">Papel</span>: clareza nas funções e ausência de conflitos de responsabilidade</li>
                <li><span className="font-medium">Mudanças</span>: gestão e comunicação sobre mudanças organizacionais</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">II. Análise e Pontuação</div>
              <div>A escala de pontuação é baseada em uma escala de 5 pontos, com as seguintes opções de resposta: Nunca, raramente, às vezes, frequentemente e sempre. As respostas são classificadas em três categorias principais:</div>
              <ul className="list-disc ml-6 space-y-1">
                <li><span className="font-medium">Favorável</span>: Indica boas condições de trabalho e aspectos positivos no ambiente organizacional. Respostas possíveis: Frequentemente e Sempre</li>
                <li><span className="font-medium">Neutro</span>: Representa uma posição intermediária, sem uma inclinação clara para o positivo ou negativo. Resposta possível: Às vezes</li>
                <li><span className="font-medium">Desfavorável</span>: Aponta possíveis problemas que podem afetar a saúde, segurança e bem-estar dos funcionários. Respostas possíveis: Nunca e Raramente.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">7. Identificação dos Riscos Psicossociais</div>
          <div className="space-y-2 text-sm leading-relaxed text-slate-700">
            <div className="font-semibold">Fatores de Risco Psicossocial:</div>
            <ul className="list-disc ml-6 space-y-1">
              <li>Sobrecarga de trabalho</li>
              <li>Ausência de autonomia ou participação nas decisões</li>
              <li>Assédio moral ou sexual</li>
              <li>Pressão por metas inalcançáveis</li>
              <li>Comunicação deficiente ou inadequada</li>
              <li>Jornadas de trabalho extensas ou irregulares</li>
              <li>Ambiente organizacional hostil ou tóxico</li>
              <li>Falta de apoio, reconhecimento ou valorização profissional</li>
              <li>Insegurança quanto à estabilidade no emprego</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">8. Estratégias de Avaliação</div>
          <div className="text-sm leading-relaxed text-slate-700">
            Aplicação de questionário online, de forma individual e anônima, garantindo total confidencialidade e a integridade das respostas fornecidas.
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">9. Análise do Resultado</div>
          <div className="text-sm leading-relaxed text-slate-700">
            A análise foi realizada a partir das respostas coletadas, com cruzamentos estatísticos no Power BI, interpretando as variáveis psicossociais de acordo com as normas técnicas e regulamentações legais pertinentes.
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">10. Conclusão</div>
          <div className="text-sm leading-relaxed text-slate-700">
            Com base na análise, conclui-se que, no momento da avaliação, os colaboradores não estão expostos a riscos psicossociais relevantes, conforme critérios das NR-01 e NR-17. A empresa deverá acompanhar continuamente os indicadores de clima organizacional e saúde mental.
          </div>
        </Card>

        <Card className="p-4 avoid-break">
          <div className="text-lg font-semibold mb-3">11. Considerações Finais</div>
          <div className="text-sm leading-relaxed text-slate-700">
            Alterações em processos, cargos ou condições de trabalho devem motivar reavaliação psicossocial conforme a NR-01. Este relatório reflete as condições no momento da emissão.
          </div>
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
                  <div key={cat.id} className="rounded-lg border p-4 mb-4 avoid-break">
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
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <div>Relatório gerado por <span className="font-semibold">{platformName}</span></div>
          <div className="text-xs mt-1">Sistema de Avaliação de Riscos Psicossociais</div>
        </div>
      </div>
    </div>
  );
};

export default NewTemplateReport;
