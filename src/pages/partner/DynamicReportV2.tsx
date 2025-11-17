import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showError, showSuccess } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import { Plus, Trash2, Edit3, Save, Download, Settings, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tipos de dados
interface Company {
  id: string;
  name: string;
  partner_id: string;
  cnpj?: string | null;
  cnae?: string | null;
  address?: string | null;
}

interface TechnicalResponsible {
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
}

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

interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  visible: boolean;
  type: 'text' | 'template' | 'chart' | 'table';
  template?: string;
}

interface ReportTemplate {
  id?: string;
  name: string;
  sections: ReportSection[];
  default?: boolean;
}

interface ActionPlanCategory {
  id: string;
  name: string;
}

interface ActionPlan {
  id: string;
  category_id: string | null;
  description: string;
  is_global: boolean;
  partner_id: string | null;
  show_in_report?: boolean;
  score_min?: number | null;
  score_max?: number | null;
}

const DynamicReportV2 = () => {
  const { session } = useSession();
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partner_id ?? (session as any)?.partnerId;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [overallAverageScore, setOverallAverageScore] = useState<number | null>(null);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [primaryResponsible, setPrimaryResponsible] = useState<TechnicalResponsible | null>(null);
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string>("Valida NR1");
  const [departmentNames, setDepartmentNames] = useState<string>("");
  const [assessmentDateRange, setAssessmentDateRange] = useState<string>("");
  
  // Estado dos templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editingSection, setEditingSection] = useState<ReportSection | null>(null);
  
  // Estado dos planos de ação
  const [apCategories, setApCategories] = useState<ActionPlanCategory[]>([]);
  const [apByCategory, setApByCategory] = useState<Record<string, ActionPlan[]>>({});

  // Estado da UI
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const defaultTemplate: ReportTemplate = {
    name: "Template Padrão",
    default: true,
    sections: [
      {
        id: "header",
        title: "Cabeçalho",
        content: "RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS RELACIONADOS AO TRABALHO",
        order: 1,
        visible: true,
        type: "text"
      },
      {
        id: "company_info",
        title: "Identificação da Empresa",
        content: "",
        order: 2,
        visible: true,
        type: "template"
      },
      {
        id: "technical_info",
        title: "Responsáveis Técnicos",
        content: "",
        order: 3,
        visible: true,
        type: "template"
      },
      {
        id: "scope",
        title: "Escopo do Trabalho",
        content: "Este relatório integra as ações de avaliação das condições laborais, com ênfase na identificação e análise técnica dos fatores de riscos psicossociais presentes no ambiente de trabalho. Atende às diretrizes da NR-01, NR-17, Guia de Fatores Psicossociais (MTE), HSE-SIT e ISO 45003.",
        order: 4,
        visible: true,
        type: "text"
      },
      {
        id: "technical_sources",
        title: "Fontes Técnicas – Organizacionais",
        content: "Condições de Trabalho: iluminação, ruído, mobiliário, ferramentas, EPIs.\\n\\nOrganização do Trabalho: metas, ritmo, pausas, autonomia, comunicação, sobrecarga.",
        order: 5,
        visible: true,
        type: "text"
      },
      {
        id: "legal_sources",
        title: "Fontes Jurídicas",
        content: "NR-01 – Disposições Gerais (Portaria MTE nº 1.419/2024).\\nNR-17 – Ergonomia (Portaria MTP nº 4.219/2022).\\nISO 45003:2021 – Diretrizes internacionais para gestão de riscos psicossociais.",
        order: 6,
        visible: true,
        type: "text"
      },
      {
        id: "methodology",
        title: "Metodologia de Avaliação",
        content: "Metodologia SIT (HSE Stress Indicator Tool), com 35 questões, avaliando seis fatores: Demandas, Controle, Suporte, Relacionamentos, Papel, Mudanças. Classificação: Favorável, Neutro, Desfavorável.",
        order: 7,
        visible: true,
        type: "text"
      },
      {
        id: "results_overview",
        title: "Visão Geral dos Resultados",
        content: "",
        order: 8,
        visible: true,
        type: "chart"
      },
      {
        id: "detailed_results",
        title: "Resultados Detalhados",
        content: "",
        order: 9,
        visible: true,
        type: "table"
      },
      {
        id: "action_plan",
        title: "Plano de Ação",
        content: "",
        order: 10,
        visible: true,
        type: "template"
      },
      {
        id: "conclusion",
        title: "Conclusão",
        content: "No momento da avaliação, os colaboradores não estão expostos a riscos psicossociais relevantes segundo NR-01 e NR-17. Recomenda-se acompanhamento contínuo e revisão de práticas.",
        order: 11,
        visible: true,
        type: "text"
      },
      {
        id: "final_considerations",
        title: "Considerações Finais",
        content: "Mudanças em processos, cargos ou condições de trabalho devem motivar reavaliação psicossocial conforme NR-01. Este relatório reflete as condições no momento da emissão.",
        order: 12,
        visible: true,
        type: "text"
      }
    ]
  };

  const fetchData = useCallback(async () => {
    if (!companyId || !partnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id,name,partner_id,cnpj,cnae,address")
        .eq("id", companyId)
        .maybeSingle();
      if (companyError) throw companyError;
      setCompany((companyData as Company) || null);

      // Buscar logo do parceiro
      const { data: partnerData } = await supabase
        .from("partners")
        .select("logo_data_url")
        .eq("id", partnerId)
        .maybeSingle();
      setPartnerLogo(partnerData?.logo_data_url ?? null);

      // Buscar nome da plataforma
      const { data: platformData } = await supabase
        .from("platform_settings")
        .select("platform_name")
        .limit(1)
        .maybeSingle();
      setPlatformName(platformData?.platform_name || "Valida NR1");

      // Buscar responsável técnico
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

      // Buscar avaliações e calcular médias
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

      // Buscar departamentos
      const { data: deptsData } = await supabase
        .from("departments")
        .select("id,name")
        .eq("company_id", companyId);
      const depts = (deptsData as any[]) || [];
      if (depts.length) setDepartmentNames(depts.map(d => d.name).join(", "));

      // Processar categorias e questões
      const assessmentIds = assessments.map(a => a.id);
      if (!assessmentIds.length) {
        setProcessedCategories([]);
        return;
      }

      const [resResponses, resQuestions, resCategories] = await Promise.all([
        supabase.from("assessment_responses").select("assessment_id,question_id,answer_value,scored_value").in("assessment_id", assessmentIds),
        supabase.from("questions").select("id,category_id,text,kind,order").eq("status", "active"),
        supabase.from("question_categories").select("id,name,description,order").eq("status", "active"),
      ]);

      const responses = (resResponses.data as any[]) || [];
      const questions = (resQuestions.data as any[]) || [];
      const categories = (resCategories.data as any[]) || [];

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

      // Buscar planos de ação
      const [catsRes, partnerRes, globalRes] = await Promise.all([
        supabase.from('question_categories').select('id,name').order('name', { ascending: true }),
        supabase.from('action_plans').select('id,category_id,description,is_global,partner_id,show_in_report,score_min,score_max').eq('is_global', false).eq('partner_id', partnerId).eq('show_in_report', true),
        supabase.from('action_plans').select('id,category_id,description,is_global,partner_id,show_in_report,score_min,score_max').eq('is_global', true).eq('show_in_report', true),
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
      
      const catAvgMap = new Map<string, number>();
      cats.forEach(c => { catAvgMap.set(c.id, c.averageScore); });
      
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
      
      const catsWithPlans = catsDb.filter(c => (finalByCat[c.id] || []).length > 0);
      setApCategories(catsWithPlans);
      setApByCategory(finalByCat);

      // Buscar templates salvos
      const { data: templatesData } = await supabase
        .from('report_templates')
        .select('id,name,sections,default')
        .eq('partner_id', partnerId)
        .order('name', { ascending: true });

      const savedTemplates = (templatesData as any[]) || [];
      const parsedTemplates = savedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        sections: JSON.parse(t.sections || '[]'),
        default: t.default || false
      }));

      setTemplates([defaultTemplate, ...parsedTemplates]);
      
      // Selecionar template padrão ou primeiro disponível
      const defaultTpl = parsedTemplates.find(t => t.default) || parsedTemplates[0];
      setCurrentTemplate(defaultTpl || defaultTemplate);

    } catch (e) {
      console.error("[DynamicReportV2] Erro ao carregar dados:", e);
      showError("Falha ao carregar dados para o relatório dinâmico.");
    } finally {
      setLoading(false);
    }
  }, [companyId, partnerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const renderSection = (section: ReportSection) => {
    if (!section.visible) return null;

    switch (section.type) {
      case 'text':
        return (
          <Card className="p-4 avoid-break">
            <div className="text-lg font-semibold mb-3">{section.title}</div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">
              {section.content.replace(/\\n/g, '\n')}
            </div>
          </Card>
        );

      case 'template':
        if (section.id === 'company_info') {
          return (
            <Card className="p-4 avoid-break">
              <div className="text-lg font-semibold mb-3">{section.title}</div>
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
          );
        }

        if (section.id === 'technical_info') {
          return (
            <Card className="p-4 avoid-break">
              <div className="text-lg font-semibold mb-3">{section.title}</div>
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
          );
        }

        if (section.id === 'action_plan') {
          if (overallAverageScore === null || overallAverageScore >= 75 || apCategories.length === 0) {
            return null;
          }

          return (
            <div className="space-y-4 print-break">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Plano de Ação e Monitoramento</h3>
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
          );
        }

        return null;

      case 'chart':
        return (
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
        );

      case 'table':
        return (
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
        );

      default:
        return null;
    }
  };

  const printToPdf = async () => {
    try {
      const node = document.getElementById('report-content-dynamic');
      if (!node) {
        showError('Conteúdo do relatório não encontrado.');
        return;
      }

      showSuccess('Gerando PDF... Aguarde.');

      // Criar capa do relatório
      const coverPage = document.createElement('div');
      coverPage.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 297mm;
        padding: 20px;
        text-align: center;
        background: #ffffff;
        box-sizing: border-box;
        page-break-after: always;
        break-after: page;
      `;

      // Logo do parceiro
      if (partnerLogo) {
        const logoImg = document.createElement('img');
        logoImg.src = partnerLogo;
        logoImg.style.cssText = 'max-width: 400px; max-height: 200px; margin-bottom: 80px; object-fit: contain;';
        coverPage.appendChild(logoImg);
      }

      // Título
      const title = document.createElement('h1');
      title.textContent = 'Relatório de Avaliação';
      title.style.cssText = 'font-size: 48px; font-weight: bold; margin-bottom: 20px; color: #1B365D;';
      coverPage.appendChild(title);

      // Subtítulo com nome da empresa
      const subtitle = document.createElement('h2');
      subtitle.textContent = company?.name || 'Empresa';
      subtitle.style.cssText = 'font-size: 32px; font-weight: 300; margin-bottom: 80px; color: #2C5282;';
      coverPage.appendChild(subtitle);

      // Data
      const dateText = document.createElement('p');
      const today = new Date();
      dateText.textContent = `Gerado em ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
      dateText.style.cssText = 'font-size: 18px; color: #64748b;';
      coverPage.appendChild(dateText);

      // Clone o elemento do conteúdo
      const clone = node.cloneNode(true) as HTMLElement;
      
      // Remove elementos que não devem aparecer no PDF
      clone.querySelectorAll('.no-print').forEach(el => el.remove());
      
      // Adiciona espaçamento
      clone.style.cssText = 'page-break-before: always; padding-top: 20px;';

      // Container final com capa + conteúdo
      const finalContainer = document.createElement('div');
      finalContainer.appendChild(coverPage);
      finalContainer.appendChild(clone);

      // Configurações do html2pdf
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Relatorio_Dinamico_${company?.name || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
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
      await html2pdf().set(opt).from(finalContainer).save();
      
      showSuccess('PDF gerado com sucesso!');
    } catch (e) {
      console.error('Falha ao gerar PDF:', e);
      showError('Falha ao gerar o PDF. Tente novamente.');
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate || !partnerId) return;

    try {
      const templateData = {
        partner_id: partnerId,
        name: currentTemplate.name,
        sections: JSON.stringify(currentTemplate.sections),
        default: currentTemplate.default || false
      };

      if (currentTemplate.id) {
        // Atualizar template existente
        const { error } = await supabase
          .from('report_templates')
          .update(templateData)
          .eq('id', currentTemplate.id)
          .eq('partner_id', partnerId);

        if (error) throw error;
        showSuccess('Template atualizado com sucesso!');
      } else {
        // Criar novo template
        const { error } = await supabase
          .from('report_templates')
          .insert(templateData);

        if (error) throw error;
        showSuccess('Template criado com sucesso!');
      }

      // Recarregar templates
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      showError('Falha ao salvar o template.');
    }
  };

  const addSection = () => {
    const newSection: ReportSection = {
      id: `section_${Date.now()}`,
      title: "Nova Seção",
      content: "Conteúdo da nova seção...",
      order: currentTemplate?.sections.length || 0,
      visible: true,
      type: "text"
    };

    setCurrentTemplate(prev => prev ? {
      ...prev,
      sections: [...prev.sections, newSection]
    } : null);
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setCurrentTemplate(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ).sort((a, b) => a.order - b.order)
    } : null);
  };

  const deleteSection = (sectionId: string) => {
    setCurrentTemplate(prev => prev ? {
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    } : null);
  };

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para acessar o relatório dinâmico.</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <span className="ml-2 text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatório Dinâmico V2 - {company?.name}</h1>
          <p className="text-sm text-muted-foreground">Personalize o conteúdo do relatório conforme suas necessidades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCustomizer(!showCustomizer)}
            className="no-print"
          >
            <Settings className="w-4 h-4 mr-2" />
            Personalizar
          </Button>
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="no-print"
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Editar' : 'Preview'}
          </Button>
          <Button onClick={printToPdf}>
            <Download className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Painel de personalização */}
      {showCustomizer && (
        <Card className="p-6 no-print">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Personalização do Relatório</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateManager(true)}
              >
                Gerenciar Templates
              </Button>
              <Button
                size="sm"
                onClick={saveTemplate}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Template
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="template-name">Nome do Template</Label>
              <Input
                id="template-name"
                value={currentTemplate?.name || ''}
                onChange={(e) => setCurrentTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Nome do template"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Seções do Relatório</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addSection}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Seção
                </Button>
              </div>

              <div className="space-y-2">
                {currentTemplate?.sections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{section.title}</div>
                      <div className="text-sm text-muted-foreground">Tipo: {section.type} • Ordem: {section.order}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={section.visible}
                        onCheckedChange={(checked) => updateSection(section.id, { visible: checked })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSection(section);
                          setShowSectionEditor(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Conteúdo do relatório */}
      <div id="report-content-dynamic" className="space-y-6">
        {/* Logo do parceiro */}
        {partnerLogo && (
          <div className="flex justify-center mb-6">
            <img src={partnerLogo} alt="Logo" className="max-w-[300px] max-h-[120px] object-contain" />
          </div>
        )}

        {/* Renderizar seções */}
        {currentTemplate?.sections
          .filter(section => section.visible)
          .sort((a, b) => a.order - b.order)
          .map(section => (
            <div key={section.id}>
              {renderSection(section)}
            </div>
          ))}

        {/* Rodapé */}
        <div className="mt-8 pt-6 border-t text-center text-muted-foreground">
          <div className="text-[10px]">Relatório gerado por <span className="font-semibold">{platformName}</span></div>
          <div className="text-[9px] mt-0.5">Sistema de Avaliação de Riscos Psicossociais</div>
        </div>
      </div>

      {/* Diálogo de edição de seção */}
      <Dialog open={showSectionEditor} onOpenChange={setShowSectionEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Seção</DialogTitle>
            <DialogDescription>
              Personalize o conteúdo desta seção do relatório.
            </DialogDescription>
          </DialogHeader>
          
          {editingSection && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="section-title">Título</Label>
                <Input
                  id="section-title"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="section-type">Tipo</Label>
                <select
                  id="section-type"
                  value={editingSection.type}
                  onChange={(e) => setEditingSection({ ...editingSection, type: e.target.value as any })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="text">Texto</option>
                  <option value="template">Template</option>
                  <option value="chart">Gráfico</option>
                  <option value="table">Tabela</option>
                </select>
              </div>

              <div>
                <Label htmlFor="section-order">Ordem</Label>
                <Input
                  id="section-order"
                  type="number"
                  value={editingSection.order}
                  onChange={(e) => setEditingSection({ ...editingSection, order: parseInt(e.target.value) || 0 })}
                />
              </div>

              {(editingSection.type === 'text' || editingSection.type === 'template') && (
                <div>
                  <Label htmlFor="section-content">Conteúdo</Label>
                  <Textarea
                    id="section-content"
                    value={editingSection.content}
                    onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSectionEditor(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingSection) {
                  updateSection(editingSection.id, editingSection);
                  setShowSectionEditor(false);
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de gerenciamento de templates */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Templates</DialogTitle>
            <DialogDescription>
              Selecione um template existente ou crie um novo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {templates.map((template) => (
              <div key={template.id || 'default'} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {template.sections.length} seções • {template.default ? 'Padrão' : 'Personalizado'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate(template);
                      setShowTemplateManager(false);
                    }}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateManager(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DynamicReportV2;