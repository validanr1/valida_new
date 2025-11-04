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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatório Individual</h1>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Avaliações
        </Button>
      </div>
      <p className="text-muted-foreground">Detalhes da avaliação de {assessment.first_name || "colaborador anônimo"}.</p>

      <Card className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Nome</div>
            <div className="font-medium">{assessment.first_name || "Anônimo"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Data da Avaliação</div>
            <div className="font-medium">{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{statusToPt(assessment.status)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Empresa</div>
            <div className="font-medium">{company.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Setor</div>
            <div className="font-medium">{assessment.department || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Cargo</div>
            <div className="font-medium">{assessment.role || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm text-muted-foreground">Score Geral</div>
            <div className={`text-xl font-bold ${scoreColorClass}`}>{assessment.score?.toFixed(1) || '—'}%</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pontuação Geral</h2>
        <div className="flex items-center gap-4">
          <Progress value={assessment.score || 0} className="h-4 flex-1" indicatorClassName={progressColorClass} />
          <span className={`text-lg font-medium ${scoreColorClass}`}>{assessment.score?.toFixed(1) || '—'}%</span>
        </div>
      </Card>

      <ReportLegend />

      {Object.entries(groupedResponses).map(([categoryName, responses]) => (
        <Card key={categoryName} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Folder className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-bold">{categoryName}</h2>
          </div>
          {responses.map((res) => (
            <div key={res.id} className="border-t pt-4">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">{res.text}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Resposta:</span> <span className="font-medium">{res.answerLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pontuação:</span> <span className={`font-medium ${getScoreColor(res.scoredValue)}`}>{res.scoredValue.toFixed(1)}%</span>
                </div>
              </div>
              <ScoreBarChart score={res.scoredValue} />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
};

export default IndividualReport;