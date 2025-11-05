import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SupabaseProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showError, showSuccess } from '@/utils/toast';
import html2pdf from 'html2pdf.js';

import ReportLegend from '@/components/reports/ReportLegend';
import OverallScoreCard from '@/components/reports/OverallScoreCard';
import CategoryIndicators from '@/components/reports/CategoryIndicators';
import QuestionIndicators from '@/components/reports/QuestionIndicators';
import AssessmentsList from '@/pages/partner/AssessmentsList';
import ActionPlanSection from '@/components/reports/ActionPlanSection';
import ReportActions from '@/components/reports/ReportActions';
import { useNavigate } from 'react-router-dom';

type Company = { id: string; name: string; partner_id: string };
type Category = { id: string; name: string; description?: string; order?: number };
type Question = { id: string; category_id?: string | null; text: string; kind?: "direct" | "inverse"; order?: number };
type Assessment = { id: string; company_id: string; score: number | null };
type AssessmentResponse = { id: string; assessment_id: string; question_id: string; answer_value: number; is_inverse: boolean; scored_value: number };
type SavedReport = { id: string; title: string; report_data?: any };

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

interface ProcessedQuestion {
  id: string;
  text: string;
  order?: number;
  averageScore: number;
  responseDistribution: {
    favorable: number;
    neutral: number;
    unfavorable: number;
  };
}

interface ProcessedCategory {
  id: string;
  name: string;
  description?: string;
  averageScore: number;
  questions: ProcessedQuestion[];
}

const ReportsOverview = () => {
  const { session } = useSession();
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [overallAverageScore, setOverallAverageScore] = useState<number | null>(null);
  const [actionPlan, setActionPlan] = useState<string>("");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [tab, setTab] = useState<'saved'|'overview'|'individuals'>('overview');
  const [partnerLogo, setPartnerLogo] = useState<string | null>(null);
  // DB Action Plans state
  const [apCategories, setApCategories] = useState<ActionPlanCategory[]>([]);
  const [apByCategory, setApByCategory] = useState<Record<string, ActionPlan[]>>({});
  // Report UI state
  const [reportTitleInput, setReportTitleInput] = useState<string>("");
  const [apVisibility, setApVisibility] = useState<Record<string, boolean>>({});
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);
  // Dados brutos para persistir no relatório salvo
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawQuestions, setRawQuestions] = useState<Question[]>([]);
  const [rawResponses, setRawResponses] = useState<Array<Pick<AssessmentResponse,'assessment_id'|'question_id'|'answer_value'|'scored_value'>>>([]);
  const [processedQuestions, setProcessedQuestions] = useState<Array<{
    id: string; text: string; order?: number; category_id?: string | null;
    averageScore: number; responseDistribution: { favorable: number; neutral: number; unfavorable: number }
  }>>([]);

  const navigate = useNavigate();

  const fetchReportData = useCallback(async () => {
    if (!companyId || !partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch base data
      const { data: companyData, error: companyError } = await supabase.from("companies").select("id,name,partner_id").eq("id", companyId).maybeSingle();
      if (companyError) throw companyError;
      setCompany((companyData as Company) || null);

      // Fetch partner logo (campo correto: logo_data_url)
      const { data: partnerData } = await supabase
        .from("partners")
        .select("logo_data_url")
        .eq("id", partnerId)
        .maybeSingle();
      setPartnerLogo(partnerData?.logo_data_url ?? null);

      const { data: assessmentsData, error: assessmentsError } = await supabase.from("assessments").select("id,company_id,score,created_at").eq("company_id", companyId).eq("partner_id", partnerId);
      if (assessmentsError) throw assessmentsError;
      
      const assessments = (assessmentsData as Assessment[]) || [];
      setAllAssessments(assessments);

      // Carregar relatórios salvos
      const { data: savedData, error: savedError } = await supabase
        .from("reports_generated")
        .select("id,title,report_data")
        .eq("partner_id", partnerId)
        .eq("company_id", companyId)
        .order("id", { ascending: false });
      if (savedError) throw savedError;
      setSavedReports((savedData as SavedReport[]) ?? []);

      if (!assessments.length) {
        setLoading(false);
        return;
      }

      const assessmentIds = assessments.map(a => a.id);

      // 2. Fetch related data
      const [
        { data: responsesData, error: responsesError },
        { data: questionsData, error: questionsError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([
        supabase.from("assessment_responses").select("assessment_id,question_id,answer_value,scored_value").in('assessment_id', assessmentIds),
        supabase.from("questions").select("id,category_id,text,kind,order").eq("status", "active"),
        supabase.from("question_categories").select("id,name,description,order").eq("status", "active"),
      ]);

      if (responsesError || questionsError || categoriesError) {
        throw responsesError || questionsError || categoriesError;
      }

      const allResponses = (responsesData as Omit<AssessmentResponse, 'is_inverse'>[]) || [];
      const allQuestions = (questionsData as Question[]) || [];
      const allCategories = (categoriesData as Category[]) || [];
      // Armazenar brutos para salvar no relatório
      setRawResponses(allResponses.map(r => ({ assessment_id: r.assessment_id, question_id: r.question_id, answer_value: r.answer_value, scored_value: r.scored_value })));
      setRawQuestions(allQuestions);
      setRawCategories(allCategories);
      const categoriesMap = new Map<string, Category>(allCategories.map(c => [c.id, c]));

      // 3. Calculate overall score
      const validAssessments = assessments.filter(a => typeof a.score === 'number');
      const totalScores = validAssessments.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgOverall = validAssessments.length > 0 ? totalScores / validAssessments.length : null;
      setOverallAverageScore(avgOverall);

      // 4. New, more robust data processing logic
      const responsesByQuestionId = allResponses.reduce((acc, res) => {
        if (!acc[res.question_id]) acc[res.question_id] = [];
        acc[res.question_id].push(res);
        return acc;
      }, {} as Record<string, typeof allResponses>);

      const processedQuestionsList = allQuestions.map(q => {
        const questionResponses = responsesByQuestionId[q.id] || [];
        if (questionResponses.length === 0) {
          return { id: q.id, text: q.text, order: q.order, category_id: q.category_id, averageScore: 0, responseDistribution: { favorable: 0, neutral: 0, unfavorable: 0 } };
        }

        let scoreSum = 0;
        let favorableCount = 0, neutralCount = 0, unfavorableCount = 0;

        questionResponses.forEach(res => {
          scoreSum += res.scored_value;
          // Corrected logic: Use scored_value to determine distribution
          if (res.scored_value >= 75) favorableCount++;
          else if (res.scored_value >= 40) neutralCount++;
          else unfavorableCount++;
        });

        const totalResponses = questionResponses.length;
        return {
          id: q.id, text: q.text, order: q.order, category_id: q.category_id,
          averageScore: scoreSum / totalResponses,
          responseDistribution: {
            favorable: (favorableCount / totalResponses) * 100,
            neutral: (neutralCount / totalResponses) * 100,
            unfavorable: (unfavorableCount / totalResponses) * 100,
          },
        };
      });

      setProcessedQuestions(processedQuestionsList);

      const processedQuestionsByCategoryId = processedQuestionsList.reduce((acc, pq) => {
        const catId = pq.category_id || 'no-category';
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(pq);
        return acc;
      }, {} as Record<string, (typeof processedQuestionsList)[number][]>);

      const finalProcessedCategories: ProcessedCategory[] = allCategories.map(cat => {
        const categoryQuestions = (processedQuestionsByCategoryId[cat.id] || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        let totalScoreSum = 0;
        let totalResponseCount = 0;
        
        categoryQuestions.forEach(q => {
            const responses = responsesByQuestionId[q.id] || [];
            if (responses.length > 0) {
                const questionScoreSum = responses.reduce((sum, res) => sum + res.scored_value, 0);
                totalScoreSum += questionScoreSum;
                totalResponseCount += responses.length;
            }
        });

        const categoryAverageScore = totalResponseCount > 0 ? totalScoreSum / totalResponseCount : 0;

        return {
          id: cat.id, name: cat.name, description: cat.description,
          averageScore: categoryAverageScore,
          questions: categoryQuestions,
        };
      }).sort((a, b) => (categoriesMap.get(a.id)?.order ?? 0) - (categoriesMap.get(b.id)?.order ?? 0));

      setProcessedCategories(finalProcessedCategories);

      // 5. Load Action Plans from DB (Partner; and Global for fallback), filter show_in_report
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

      const cats = (catsRes.data as ActionPlanCategory[]) || [];
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
      finalProcessedCategories.forEach(c => { catAvgMap.set(c.id, c.averageScore); });

      // Decide final plans per category: partner first; else global filtered by band
      const finalByCat: Record<string, ActionPlan[]> = {};
      cats.forEach((c) => {
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
      const catsWithPlans = cats.filter(c => (finalByCat[c.id] || []).length > 0);
      setApCategories(catsWithPlans);
      setApByCategory(finalByCat);
      // Initialize visibility defaults for categories with plans (shown = true)
      setApVisibility(prev => {
        const next = { ...prev } as Record<string, boolean>;
        catsWithPlans.forEach(c => {
          if (next[c.id] === undefined) next[c.id] = true;
        });
        return next;
      });

      // 6. Generate action plan (legacy text)
      let plan = "Plano de Ação Sugerido:\n\n";
      if (avgOverall !== null) {
        if (avgOverall < 40) {
          plan += "A empresa apresenta um risco psicossocial elevado. É crucial implementar ações corretivas imediatas em todas as áreas. Considere workshops de gestão de estresse, revisão de políticas de trabalho e suporte psicológico.\n\n";
        } else if (avgOverall < 75) {
          plan += "A empresa requer atenção em algumas áreas. Há um possível risco psicossocial. Recomenda-se revisar as práticas de gestão, comunicação e equilíbrio entre vida pessoal e profissional. Monitore de perto as categorias com pontuações mais baixas.\n\n";
        } else {
          plan += "A percepção geral do ambiente de trabalho é boa. Mantenha as práticas atuais e continue promovendo um ambiente saudável. Considere pesquisas de satisfação periódicas para identificar pontos de melhoria contínua.\n\n";
        }
      }
      plan += "Detalhes por Categoria:\n";
      finalProcessedCategories.forEach(cat => {
        if (cat.averageScore < 75 && cat.averageScore > 0) {
          plan += `- Categoria "${cat.name}" (Média: ${cat.averageScore.toFixed(1)}%): Requer atenção. Focar nas perguntas com menor pontuação dentro desta categoria.\n`;
        }
      });
      setActionPlan(plan);

    } catch (error) {
      console.error("Failed to fetch report data:", error);
      showError("Falha ao carregar os dados do relatório.");
    } finally {
      setLoading(false);
    }
  }, [companyId, partnerId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleSaveReport = async () => {
    if (!companyId || !partnerId || !company) {
      showError("Dados da empresa ou parceiro ausentes para salvar o relatório.");
      return;
    }

    if (overallAverageScore === null) {
      showError("Não há dados de avaliação para salvar no relatório.");
      return;
    }

    const reportTitle = reportTitleInput.trim() || `Relatório Geral - ${company.name} (${new Date().toLocaleDateString()})`;
    const reportContent = {
      overallAverageScore,
      actionPlan,
      actionPlanVisibility: apVisibility,
      // Identificação
      generatedAt: new Date().toISOString(),
      companyName: company.name,
      companyId: company.id,
      partnerId: partnerId,
      // Listas brutas
      categories: rawCategories,
      questions: rawQuestions,
      responses: rawResponses,
      assessments: allAssessments.map(a => ({ id: a.id, company_id: a.company_id, score: a.score })),
      // Cálculos
      processedCategories,
      processedQuestions,
    };

    try {
      const payload: any = {
        partner_id: partnerId,
        company_id: companyId,
        title: reportTitle,
        report_data: reportContent,
      };
      const { error } = await (supabase as any).from("reports_generated").insert(payload);

      if (error) {
        console.error("Failed to save report:", error);
        showError("Falha ao salvar o relatório no banco de dados.");
        return;
      }

      showSuccess("Relatório salvo com sucesso!");
    } catch (error) {
      console.error("Unexpected error saving report:", error);
      showError("Ocorreu um erro inesperado ao salvar o relatório.");
    }
  };

  

  const handleOpenSavedReport = (r: SavedReport) => {
    const rd = (r as any)?.report_data || {};
    const cat: any[] = rd.processedCategories || [];
    const score = rd.overallAverageScore;
    const compName = rd.companyName || '';
    const genAt = rd.generatedAt ? new Date(rd.generatedAt).toLocaleString() : '';
    const htmlCats = cat.map(c => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;">
        <div style="font-weight:600;margin-bottom:4px;">${c.name}</div>
        <div style="font-size:14px;opacity:.8;">Média: ${typeof c.averageScore==='number' ? c.averageScore.toFixed(1) : '-'}%</div>
      </div>
    `).join('');
    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="utf-8" />
      <title>${r.title || 'Relatório salvo'}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; background:#f8fafc;}</style>
    </head><body>
      <div class="container mx-auto p-4 space-y-4">
        <h1 class="text-2xl font-bold">${r.title || 'Relatório salvo'}</h1>
        <p class="text-sm text-gray-500">Empresa: ${compName} • Gerado em: ${genAt}</p>
        <div class="rounded-xl bg-white border p-4">
          <div class="text-sm text-gray-500">Pontuação Geral</div>
          <div class="text-2xl font-bold">${typeof score==='number' ? score.toFixed(1) : '-'}%</div>
        </div>
        <h2 class="text-xl font-semibold">Indicadores por Categoria</h2>
        <div class="grid gap-3 md:grid-cols-3">${htmlCats}</div>
        ${rd.actionPlan ? `<div class="rounded-xl bg-white border p-4"><h3 class="text-lg font-semibold mb-2">Plano de Ação</h3><pre class="whitespace-pre-wrap text-sm">${rd.actionPlan}</pre></div>` : ''}
      </div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      showError('Não foi possível abrir o relatório salvo.');
    }
  };

  const handleGeneratePdf = async () => {
    try {
      const node = document.getElementById('report-content');
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

      // Logo do parceiro apenas
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

      // Clone o elemento do conteúdo para não afetar a página
      const clone = node.cloneNode(true) as HTMLElement;
      
      // Remove elementos que não devem aparecer no PDF
      clone.querySelectorAll('.no-print').forEach(el => el.remove());
      
      // Adiciona espaçamento e garante que comece em nova página
      clone.style.cssText = 'page-break-before: always; padding-top: 20px;';

      // Container final com capa + conteúdo
      const finalContainer = document.createElement('div');
      finalContainer.appendChild(coverPage);
      finalContainer.appendChild(clone);

      // Configurações do html2pdf
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Relatorio_${company?.name || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`,
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

  

  const handleDeleteSavedReport = async (id: string) => {
    try {
      const { error, count } = await (supabase as any)
        .from('reports_generated')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('partner_id', partnerId)
        .eq('company_id', companyId);
      if (error) {
        console.error('Failed to delete saved report:', error);
        showError('Falha ao excluir o relatório salvo.');
        return;
      }
      if (!count || count === 0) {
        console.warn('Delete returned count=0. Possible RLS/filters mismatch.', { id, partnerId, companyId });
        showError('Não foi possível excluir o relatório (verifique permissões e escopo).');
        return;
      }
      // Recarregar lista do servidor para garantir consistência
      const { data: savedData, error: refetchError } = await supabase
        .from('reports_generated')
        .select('id,title,report_data')
        .eq('partner_id', partnerId)
        .eq('company_id', companyId)
        .order('id', { ascending: false });
      if (refetchError) {
        console.warn('Deleted, but failed to refetch saved reports:', refetchError);
        setSavedReports((prev) => prev.filter(r => r.id !== id));
      } else {
        setSavedReports((savedData as SavedReport[]) ?? []);
      }
      showSuccess('Relatório excluído.');
    } catch (e) {
      console.error('Unexpected error deleting saved report:', e);
      showError('Erro inesperado ao excluir o relatório salvo.');
    }
  };

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para visualizar o relatório geral.</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando relatório...</p>
      </div>
    );
  }

  if (!company || allAssessments.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Nenhum dado de avaliação encontrado para a empresa selecionada.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Relatórios - {company.name}</h1>
      <p className="text-muted-foreground">Visão geral e relatórios salvos das avaliações.</p>

      {/* Abas em largura total */}
      <div className="w-full">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
          <button
            className={`h-10 rounded-lg text-sm font-medium ${tab==='saved' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setTab('saved')}
          >Relatórios Salvos</button>
          <button
            className={`h-10 rounded-lg text-sm font-medium ${tab==='overview' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setTab('overview')}
          >Relatório Geral</button>
          <button
            className={`h-10 rounded-lg text-sm font-medium ${tab==='individuals' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'}`}
            onClick={() => setTab('individuals')}
          >Individuais</button>
        </div>
      </div>

      {tab === 'saved' && (
        <Card className="p-0 overflow-x-auto">
          <table className="min-w-[800px] w-full">
            <thead>
              <tr className="bg-[#1B365D] text-white">
                <th className="text-left px-4 py-2 first:rounded-tl-xl">Título</th>
                <th className="text-left px-4 py-2">Data</th>
                <th className="text-right px-4 py-2 last:rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody>
              {savedReports.map(r => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">{(r as any)?.report_data?.generatedAt ? new Date((r as any).report_data.generatedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button onClick={() => handleOpenSavedReport(r)} className="rounded-md border px-3 py-1 text-sm hover:bg-muted">Abrir</button>
                    <button onClick={() => setReportToDelete(r)} className="rounded-md border border-red-300 text-red-600 px-3 py-1 text-sm hover:bg-red-50">Excluir</button>
                  </td>
                </tr>
              ))}
              {savedReports.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={3}>Nenhum relatório salvo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'overview' && (
        <div id="report-content" className="space-y-6">
          <div className="no-print">
            <ReportActions
              onSave={handleSaveReport}
              onGeneratePdf={handleGeneratePdf}
              onOpenNewTemplate={() => navigate('/partner/reports/versao-completa')}
              loading={loading}
            />
            <div className="mt-3 grid gap-2">
              <label className="text-sm font-medium">Título do Relatório</label>
              <input
                className="border rounded-md px-3 py-2 text-sm"
                placeholder={`Relatório Geral - ${company.name} (${new Date().toLocaleDateString()})`}
                value={reportTitleInput}
                onChange={(e)=> setReportTitleInput(e.target.value)}
              />
            </div>
          </div>

          <div className="avoid-break">
            <OverallScoreCard score={overallAverageScore} loading={loading} />
          </div>

          <div className="print-break avoid-break">
            <CategoryIndicators categories={processedCategories} loading={loading} />
          </div>

          <div className="avoid-break">
            <QuestionIndicators categories={processedCategories} loading={loading} />
          </div>

          {/* Removido: seção de plano de ação gerado por texto. */}

          {/* DB-backed Action Plans section (only if overall score < 75) */}
          {overallAverageScore !== null && overallAverageScore < 75 && (
            <div className="avoid-break">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-3">Plano de Ação</h3>
                {apCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum plano de ação cadastrado.</p>
                ) : (
                  <div className="space-y-4">
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
                      const show = apVisibility[cat.id] ?? true;
                      return (
                        <div key={cat.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{cat.name}</div>
                              <div className="text-sm text-slate-700 mt-1">
                                <span className="font-medium">Média:</span> {typeof catAvg==='number' ? catAvg.toFixed(1) : '—'}
                                <span className="mx-2">|</span>
                                <span className="font-medium">Nível de Risco:</span> <span className={risk.color}>{risk.label}</span>
                              </div>
                              <div className="text-sm text-slate-700 mt-1">
                                <span className="font-medium">Ação Recomendada:</span> {catAvg !== null && catAvg < 40 ? 'Intervenção imediata necessária.' : 'Ações corretivas recomendadas.'}
                              </div>
                              <div className="text-sm font-medium mt-2">Medidas de Prevenção/Controle:</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                id={`show_${cat.id}`}
                                type="checkbox"
                                checked={!!show}
                                onChange={(e)=> setApVisibility(prev=> ({ ...prev, [cat.id]: e.target.checked }))}
                              />
                              <label htmlFor={`show_${cat.id}`} className="text-sm">Mostrar</label>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-slate-700">
                            {show && items.map((p) => (
                              <div key={p.id} className="bg-slate-50 rounded-md p-2">{p.description}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {tab === 'individuals' && (
        <div className="-m-4">
          <AssessmentsList />
        </div>
      )}

      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório salvo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o relatório "{reportToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (reportToDelete) { handleDeleteSavedReport(reportToDelete.id); setReportToDelete(null); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportsOverview;