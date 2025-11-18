import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SupabaseProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showError } from '@/utils/toast';
import { ArrowLeft, User, Calendar, Briefcase, Building2, Folder, HelpCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportLegend from '@/components/reports/ReportLegend';
import { Progress } from '@/components/ui/progress';
import ScoreBarChart from '@/components/reports/ScoreBarChart';

type Company = { id: string; name: string; partner_id: string };
type Category = { id: string; name: string; description?: string; order?: number };
type Question = { id: string; category_id?: string | null; text: string; kind?: "direct" | "inverse"; order?: number };
type ScaleItem = { id: string; label: string; value: number; order: number };
type Assessment = {
  id: string;
  company_id: string;
  partner_id: string;
  first_name?: string;
  age?: number;
  gender?: string;
  department?: string;
  role?: string;
  ghe?: string;
  ges?: string;
  status?: string;
  score?: number;
  created_at?: string;
};
type AssessmentResponse = { id: string; assessment_id: string; question_id: string; answer_value: number; is_inverse: boolean; scored_value: number };

interface ProcessedQuestionResponse {
  id: string;
  text: string;
  categoryName: string;
  answerLabel: string;
  answerValue: number;
  scoredValue: number;
  isInverse: boolean;
}

const getScoreColor = (score: number) => {
  if (score < 40) return "text-red-500";
  if (score < 75) return "text-yellow-500";
  return "text-emerald-500";
};

const getProgressColor = (score: number) => {
  if (score < 40) return "bg-red-500";
  if (score < 75) return "bg-yellow-500";
  return "bg-emerald-500";
};

const IndividualReport = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { session } = useSession();
  const companyIdFromSession = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [processedResponses, setProcessedResponses] = useState<ProcessedQuestionResponse[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const fetchIndividualReportData = useCallback(async () => {
    if (!assessmentId || !partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1) Buscar a avaliação pelo ID e partner
      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .eq("partner_id", partnerId)
        .maybeSingle();

      const assessmentRow = (assessmentData as Assessment) || null;
      setAssessment(assessmentRow);

      // 2) Buscar a empresa pelo company_id da avaliação
      const companyId = assessmentRow?.company_id ?? companyIdFromSession;
      const { data: companyData } = companyId
        ? await supabase.from("companies").select("id,name,partner_id").eq("id", companyId).maybeSingle()
        : { data: null } as any;
      setCompany((companyData as Company) || null);

      // 3) Demais dados para montar o relatório
      const [
        { data: responsesData },
        { data: questionsData },
        { data: categoriesData },
        { data: scaleData },
      ] = await Promise.all([
        supabase.from("assessment_responses").select("*").eq("assessment_id", assessmentId),
        supabase.from("questions").select("id,category_id,text,kind,order"),
        supabase.from("question_categories").select("id,name,description,order"),
        supabase.from("answer_scale").select("id,label,value,order"),
      ]);

      const categoriesArr = (categoriesData as Category[]) || [];
      setAllCategories(categoriesArr);

      const questionsMap = new Map<string, Question>((questionsData as Question[] || []).map(q => [q.id, q]));
      const categoriesMap = new Map<string, Category>((categoriesData as Category[] || []).map(c => [c.id, c]));
      const scaleMap = new Map<number, string>((scaleData as ScaleItem[] || []).map(s => [s.value, s.label]));

      const processed: ProcessedQuestionResponse[] = (responsesData as AssessmentResponse[] || [])
        .map(res => {
          const question = questionsMap.get(res.question_id);
          if (!question) return null;

          const category = question.category_id ? categoriesMap.get(question.category_id) : undefined;
          const answerLabel = scaleMap.get(res.answer_value) || res.answer_value.toString();

          return {
            id: res.id,
            text: question.text,
            categoryName: category?.name || "Sem Categoria",
            answerLabel: answerLabel,
            answerValue: res.answer_value,
            scoredValue: res.scored_value,
            isInverse: res.is_inverse,
          };
        })
        .filter(Boolean) as ProcessedQuestionResponse[];

      const categoriesOrderMap = new Map<string, number>(categoriesArr.map(c => [c.name, c.order ?? 999]));
      setProcessedResponses(processed.sort((a, b) => {
        const catA = categoriesOrderMap.get(a.categoryName) ?? 999;
        const catB = categoriesOrderMap.get(b.categoryName) ?? 999;
        if (catA !== catB) return catA - catB;
        return a.text.localeCompare(b.text);
      }));

    } catch (error) {
      console.error("Failed to fetch individual report data:", error);
      showError("Falha ao carregar os dados do relatório individual.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId, partnerId, companyIdFromSession]);

  useEffect(() => {
    fetchIndividualReportData();
  }, [fetchIndividualReportData]);

  const scoreColorClass = typeof assessment?.score === 'number' ? getScoreColor(assessment.score) : 'text-muted-foreground';
  const progressColorClass = typeof assessment?.score === 'number' ? getProgressColor(assessment.score) : 'bg-muted-foreground';

  const groupedResponses = useMemo(() => {
    return processedResponses.reduce((acc, response) => {
      if (!acc[response.categoryName]) {
        acc[response.categoryName] = [];
      }
      acc[response.categoryName].push(response);
      return acc;
    }, {} as Record<string, ProcessedQuestionResponse[]>);
  }, [processedResponses]);

  const statusToPt = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'completed': return 'Concluída';
      case 'in_progress': return 'Em andamento';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      default: return s || '—';
    }
  };

  if (!assessmentId) {
  return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">ID da avaliação não fornecido.</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando relatório individual...</p>
      </div>
    );
  }

  if (!assessment || !company) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Avaliação ou empresa não encontrada.</div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      {/* Header Moderno */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Relatório de Avaliação
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  {assessment.first_name || "Colaborador"} • {company.name}
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="border-slate-200 hover:border-slate-300 hover:bg-white/50 backdrop-blur-sm transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            Voltar
          </Button>
        </div>

        {/* Badges de Status Modernos */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${
              assessment.status === 'completed' ? 'bg-emerald-500' :
              assessment.status === 'in_progress' ? 'bg-amber-500' :
              assessment.status === 'pending' ? 'bg-slate-400' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-slate-700">{statusToPt(assessment.status)}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
            <Calendar className="h-3 w-3 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Card de Informações Principais - Design Moderno */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Colaborador</p>
                    <p className="text-lg font-bold text-slate-900">{assessment.first_name || "Anônimo"}</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Empresa</p>
                    <p className="text-lg font-bold text-slate-900">{company.name}</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Departamento</p>
                    <p className="text-lg font-bold text-slate-900">{assessment.department || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Cargo</p>
                    <p className="text-lg font-bold text-slate-900">{assessment.role || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Pontuação Geral - Design Moderno com Animação */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Pontuação Geral</h2>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  typeof assessment?.score === 'number' && assessment.score >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  typeof assessment?.score === 'number' && assessment.score >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {typeof assessment?.score === 'number' && assessment.score >= 80 ? 'Excelente' :
                   typeof assessment?.score === 'number' && assessment.score >= 60 ? 'Bom' : 'A Melhorar'}
                </div>
                <div className={`text-3xl font-bold ${scoreColorClass}`}>
                  {assessment.score?.toFixed(1) || '—'}%
                </div>
              </div>
            </div>
            
            {/* Barra de Progresso Animada */}
            <div className="relative">
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColorClass} relative overflow-hidden`}
                  style={{ width: `${assessment.score || 0}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend Moderna */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
          <ReportLegend />
        </div>

        {/* Categorias com Cards Modernos */}
        <div className="grid gap-8">
          {Object.entries(groupedResponses).map(([categoryName, responses]) => {
            const categoryScore = responses.reduce((sum, res) => sum + res.scoredValue, 0) / responses.length;
            return (
              <div key={categoryName} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="p-8">
                  {/* Header da Categoria */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border border-slate-200">
                        <Folder className="h-7 w-7 text-slate-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{categoryName}</h2>
                        <p className="text-sm text-slate-500 font-medium">
                          {responses.length} questão{responses.length !== 1 ? 'ões' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        categoryScore >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        categoryScore >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        Média: {categoryScore.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Questões */}
                  <div className="space-y-6">
                    {responses.map((res, index) => (
                      <div key={res.id} className={`group transition-all duration-200 ${
                        index > 0 ? 'pt-6 border-t border-slate-100' : ''
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0 mt-1">
                            <HelpCircle className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 mb-3 leading-relaxed">
                                {res.text}
                              </h3>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resposta</p>
                                  <p className="text-base font-medium text-slate-900">{res.answerLabel}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pontuação</p>
                                  <p className={`text-base font-bold ${getScoreColor(res.scoredValue)}`}>
                                    {res.scoredValue.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Barra de Pontuação Moderna */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-600">Desempenho</span>
                                <span className="text-sm font-bold text-slate-700">{res.scoredValue.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(res.scoredValue)} relative`}
                                  style={{ width: `${res.scoredValue}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IndividualReport;