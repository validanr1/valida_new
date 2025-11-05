import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Shield, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getSettings } from "@/services/settings";

type Company = { id: string; name: string; cnpj?: string; partner_id: string; assessment_type_id?: string };
type Category = { id: string; name: string; description?: string; order?: number };
type Question = { id: string; category_id?: string | null; text: string; kind?: "direct" | "inverse"; order?: number };
type ScaleItem = { id: string; label: string; value: number; order: number };
type Department = { id: string; name: string };
type Role = { id: string; name: string; department_id?: string };
type AssessmentItem = { id: string; name: string; description?: string };

type Demographics = {
  firstName: string;
  age: number | null;
  gender: string;
  department: string; // ID do departamento
  role: string;       // ID do cargo
  assessmentItem: string; // ID do item GES/GHE
};

type Answer = {
  questionId: string;
  answerValue: number;
  isInverse: boolean;
  scoredValue: number;
};

const EvaluationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyParam = searchParams.get("company") || "";
  const sectorParam = searchParams.get("sector") || "";
  const positionParam = searchParams.get("position") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [platformName, setPlatformName] = useState("Valida NR1");
  const [effectiveLogoPrimaryDataUrl, setEffectiveLogoPrimaryDataUrl] = useState<string | undefined>(undefined); // Novo estado para o logo
  const [assessmentTypeName, setAssessmentTypeName] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerScale, setAnswerScale] = useState<ScaleItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);

  const [currentStep, setCurrentStep] = useState(0);

  const [demographics, setDemographics] = useState<Demographics>({
    firstName: "",
    age: null,
    gender: "",
    department: sectorParam,
    role: positionParam,
    assessmentItem: "",
  });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  // Novo: status do formulário
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [statusChecked, setStatusChecked] = useState<boolean>(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  const typeLabel = useMemo(() => {
    const n = (assessmentTypeName || "").toUpperCase();
    if (n.includes("GHE")) return "GHE";
    if (n.includes("GES")) return "GES";
    return "Tipo de Avaliação";
  }, [assessmentTypeName]);

  const questionsByCategoryId = useMemo(() => {
    const map: Record<string, Question[]> = {};
    questions.forEach((q) => {
      const catId = q.category_id || "no-category";
      if (!map[catId]) map[catId] = [];
      map[catId].push(q);
    });
    Object.values(map).forEach((qList) => qList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return map;
  }, [questions]);

  const totalSteps = 1 + sortedCategories.length + 1;

  const currentCategory = useMemo(() => {
    if (currentStep === 0 || currentStep > sortedCategories.length) return null;
    return sortedCategories[currentStep - 1];
  }, [currentStep, sortedCategories]);

  const currentQuestions = useMemo(() => {
    if (!currentCategory) return [];
    return questionsByCategoryId[currentCategory.id] || [];
  }, [currentCategory, questionsByCategoryId]);

  const availableRolesForDept = useMemo(() => {
    if (!demographics.department) return roles;
    return roles.filter((r) => r.department_id === demographics.department || !r.department_id);
  }, [roles, demographics.department]);

  const fetchFormStatus = useCallback(async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("enabled, updated_at, created_at")
        .eq("partner_id", partnerId)
        .eq("type", "evaluation")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      // Se não houver linha, considere DESABILITADO por segurança
      const enabled = (data as any)?.enabled;
      setFormEnabled(Boolean(enabled));
    } catch (e) {
      console.error("Erro ao buscar status do formulário:", e);
      // Em caso de erro, desabilite por segurança
      setFormEnabled(false);
    } finally {
      setStatusChecked(true);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: companyData },
        { data: categoriesData },
        { data: questionsData },
        { data: scaleData },
        { data: departmentsData },
        { data: rolesData },
      ] = await Promise.all([
        supabase.from("companies").select("id,name,cnpj,partner_id,assessment_type_id").eq("id", companyParam).maybeSingle(),
        supabase.from("question_categories").select("id,name,description,order").eq("status", "active").order("order", { ascending: true }),
        supabase.from("questions").select("id,category_id,text,kind,order").eq("status", "active").order("order", { ascending: true }),
        supabase.from("answer_scale").select("id,label,value,order").order("order", { ascending: true }),
        supabase.from("departments").select("id,name").eq("company_id", companyParam).order("name", { ascending: true }),
        supabase.from("roles").select("id,name,department_id").eq("company_id", companyParam).order("name", { ascending: true }),
      ]);

      const comp = (companyData as Company) || null;
      setCompany(comp);
      setCategories((categoriesData as Category[]) || []);
      setQuestions((questionsData as Question[]) || []);
      setAnswerScale((scaleData as ScaleItem[]) || []);
      setDepartments((departmentsData as Department[]) || []);
      setRoles((rolesData as Role[]) || []);

      // Buscar itens GES/GHE se a empresa tiver assessment_type_id
      if (comp?.assessment_type_id && comp?.partner_id) {
        const { data: itemsData } = await supabase
          .from("assessment_type_items")
          .select("id,name,description")
          .eq("partner_id", comp.partner_id)
          .eq("assessment_type_id", comp.assessment_type_id)
          .eq("status", "active")
          .order("name", { ascending: true });
        setAssessmentItems((itemsData as AssessmentItem[]) || []);
      }

      const globalSettings = await getSettings();
      setPlatformName(globalSettings.platformName);
      setEffectiveLogoPrimaryDataUrl(globalSettings.logoPrimaryDataUrl); // Default to global

      // Buscar nome do tipo de avaliação da empresa
      if (comp?.assessment_type_id) {
        const { data: at } = await supabase
          .from("assessment_types")
          .select("name")
          .eq("id", comp.assessment_type_id)
          .maybeSingle();
        setAssessmentTypeName(((at as any)?.name as string) ?? comp.assessment_type_id);
      } else {
        setAssessmentTypeName(null);
      }

      if (comp?.partner_id) {
        // Fetch partner's white label settings
        const { data: partnerSettings, error: partnerSettingsError } = await supabase
          .from("partners")
          .select("platform_name, logo_data_url")
          .eq("id", comp.partner_id)
          .maybeSingle();

        if (partnerSettingsError) {
          console.error("Error fetching partner white label settings:", partnerSettingsError);
        } else if (partnerSettings) {
          // Prioritize partner's settings
          setPlatformName(partnerSettings.platform_name ?? globalSettings.platformName);
          setEffectiveLogoPrimaryDataUrl(partnerSettings.logo_data_url ?? globalSettings.logoPrimaryDataUrl);
        }

        await fetchFormStatus(comp.partner_id);
      } else {
        setStatusChecked(true);
      }

      // Removido: Prefill de dados de teste e respostas padrão

    } catch (err) {
      console.error("Failed to load form data:", err);
      showError("Falha ao carregar o formulário. Tente novamente.");
      setStatusChecked(true);
    } finally {
      setLoading(false);
    }
  }, [companyParam, fetchFormStatus, supabase]); // Adicionar supabase como dependência

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleDemographicsChange = (field: keyof Demographics, value: string | number | null) => {
    setDemographics((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (questionId: string, scaleValue: string) => {
    const question = questions.find((q) => q.id === questionId);
    const selectedScaleItem = answerScale.find((s) => s.value.toString() === scaleValue);

    if (!question || !selectedScaleItem) {
      console.error("Question or scale item not found for answer.");
      return;
    }

    const isInverse = question.kind === "inverse";
    const scoredValue = isInverse ? 100 - selectedScaleItem.value : selectedScaleItem.value;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        answerValue: selectedScaleItem.value,
        isInverse,
        scoredValue,
      },
    }));
  };

  const validateDemographics = () => {
    if (!demographics.department) {
      showError("Por favor, selecione seu setor.");
      return false;
    }
    if (!demographics.role) {
      showError("Por favor, selecione seu cargo.");
      return false;
    }
    return true;
  };

  const validateCurrentCategoryAnswers = () => {
    if (!currentCategory) return false;
    const questionsForCategory = questionsByCategoryId[currentCategory.id] || [];
    for (const q of questionsForCategory) {
      if (!answers[q.id]) {
        showError("Por favor, responda a todas as perguntas desta seção.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!formEnabled) {
      showError("Este formulário está desativado no momento.");
      return;
    }
    if (currentStep === 0) {
      if (!validateDemographics()) return;
      if (sortedCategories.length === 0) {
        setCurrentStep(totalSteps - 1);
        return;
      }
    } else if (currentStep <= sortedCategories.length) {
      if (!validateCurrentCategoryAnswers()) return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!formEnabled) {
      showError("Este formulário está desativado no momento.");
      return;
    }
    if (sortedCategories.length > 0 && currentStep <= sortedCategories.length) {
      if (!validateCurrentCategoryAnswers()) return;
    }

    if (!company?.id || !company.partner_id) {
      showError("Erro: Informações da empresa não disponíveis.");
      return;
    }

    setSubmitting(true);

    let totalScore = 0;
    let answeredQuestionsCount = 0;

    Object.values(answers).forEach((answer) => {
      totalScore += answer.scoredValue;
      answeredQuestionsCount++;
    });

    const rawAverageScore = answeredQuestionsCount > 0 ? totalScore / answeredQuestionsCount : 0;
    const averageScore = Math.round(rawAverageScore * 10) / 10; // Arredonda para 1 casa decimal, mantendo como número

    // Mapear IDs de departamento, cargo e item GES/GHE para seus nomes antes de enviar
    const departmentName = departments.find(d => d.id === demographics.department)?.name || demographics.department;
    const roleName = roles.find(r => r.id === demographics.role)?.name || demographics.role;
    const assessmentItemName = assessmentItems.find(i => i.id === demographics.assessmentItem)?.name || null;

    const payload = {
      company_id: company.id,
      partner_id: company.partner_id,
      first_name: demographics.firstName.trim() || null,
      age: demographics.age || null,
      gender: demographics.gender || null,
      department: departmentName,
      role: roleName,
      assessment_type_name: assessmentTypeName || null,
      assessment_item: assessmentItemName, // Nome do item GES/GHE selecionado
      answers,
      averageScore,
    };

    console.log("[EvaluationForm] Payload sendo enviado para a função Edge:", JSON.stringify(payload, null, 2));

    try {
      const functionUrl = `${supabase.supabaseUrl}/functions/v1/submit-assessment`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Edge Function error response:", responseData);
        const errorMessage = responseData.details || responseData.error || "Falha ao enviar a avaliação. Tente novamente.";
        showError(errorMessage);
        return;
      }

      showSuccess("Avaliação enviada com sucesso! Obrigado por sua participação.");
      setSubmitted(true);
    } catch (err) {
      console.error("Erro inesperado ao enviar avaliação:", err);
      showError("Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando formulário...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-xl p-6">
          <h1 className="text-xl font-semibold">Formulário de Avaliação</h1>
          <p className="mt-2 text-sm text-muted-foreground">Link inválido ou empresa não encontrada.</p>
        </Card>
      </div>
    );
  }

  if (statusChecked && !formEnabled) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl rounded-2xl p-6 sm:p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Formulário indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este formulário de avaliação está desativado no momento. Tente novamente mais tarde.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl rounded-2xl p-6 sm:p-8 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold leading-tight">Avaliação Concluída!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Obrigado por participar da avaliação de riscos psicossociais. Suas respostas são confidenciais e contribuem para melhorar o ambiente de trabalho.
          </p>

          <div className="mt-6 p-4 bg-muted rounded-lg text-left">
            <h2 className="text-md font-semibold mb-2">Próximos Passos</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Suas respostas foram enviadas para análise</li>
              <li>Os resultados agregados serão disponibilizados para a empresa</li>
              <li>Sua identidade será mantida em sigilo</li>
              <li>Em caso de necessidade, recursos de apoio estão disponíveis</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => alert("Recursos de apoio não implementados.")}>Recursos de Apoio</Button>
            <Button onClick={() => navigate("/")}>Finalizar</Button>
          </div>
        </Card>
      </div>
    );
  }

  const disabledBanner = !formEnabled && statusChecked ? (
    <div className="mb-4">
      <Card className="border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Formulário desativado</div>
            <p className="text-sm text-red-700">
              Este formulário de avaliação está desativado no momento. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </Card>
    </div>
  ) : null;

  const progressValue = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-3xl rounded-2xl p-6 sm:p-8">
        {disabledBanner}
        <div className="mb-6 text-center">
          {effectiveLogoPrimaryDataUrl ? (
            <img src={effectiveLogoPrimaryDataUrl} alt={platformName} className="mx-auto h-[78px] w-auto object-contain mb-4" />
          ) : (
            <img src="https://fbf643ab170cf8b59974997c7d9a22c0.cdn.bubble.io/cdn-cgi/image/w=192,h=125,f=auto,dpr=1.25,fit=contain/f1754152545015x300104446190593300/Logo%201.png" alt="Valida NR1" width={120} height={78} className="mx-auto h-[78px] w-[120px] mb-4" />
          )}
          <div className="text-xs text-muted-foreground">Etapa {currentStep + 1} de {totalSteps}</div>
          <h1 className="text-2xl font-semibold leading-tight">Ferramenta de Indicador de Estresse</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este questionário é <span className="font-semibold">totalmente anônimo</span> e contém perguntas sobre suas condições de trabalho. Sua opinião é essencial para melhorar o ambiente de trabalho.
          </p>
          <Progress value={progressValue} className="w-full mt-4" />
        </div>

        {/* Company Info */}
        <div className="mb-6 p-4 border rounded-lg text-center">
          <h2 className="text-lg font-semibold">{company.name}</h2>
          <p className="text-sm text-muted-foreground">{company.cnpj || "CNPJ não informado"}</p>
        </div>

        {currentStep === 0 ? (
          <div className="space-y-4 opacity-100">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800">GARANTIA DE ANONIMATO</h3>
                <p className="text-sm text-blue-700">
                  Todas as informações coletadas neste formulário são <span className="font-semibold">completamente anônimas</span>. Seus dados pessoais <span className="font-semibold">NÃO serão disponibilizados para a empresa</span> de forma individualizada. Usaremos estas informações apenas para análises estatísticas agregadas que ajudarão a melhorar o ambiente de trabalho.
                </p>
              </div>
            </div>

            {/* Demografia */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="firstName">Primeiro Nome (Opcional)</Label>
                <Input
                  id="firstName"
                  placeholder="Seu primeiro nome"
                  value={demographics.firstName}
                  onChange={(e) => handleDemographicsChange("firstName", e.target.value)}
                  className="h-10 rounded-xl"
                  disabled={!formEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade (Opcional)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Sua idade"
                  value={demographics.age || ""}
                  onChange={(e) => handleDemographicsChange("age", Number(e.target.value) || null)}
                  className="h-10 rounded-xl"
                  disabled={!formEnabled}
                />
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="gender">Sexo (Opcional)</Label>
                <Select value={demographics.gender} onValueChange={(v) => handleDemographicsChange("gender", v)} >
                  <SelectTrigger id="gender" className="h-10 rounded-xl" disabled={!formEnabled}>
                    <SelectValue placeholder="Selecione seu sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="nao-binario">Não binário</SelectItem>
                    <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="department">Setor</Label>
                <Select value={demographics.department} onValueChange={(v) => {
                  handleDemographicsChange("department", v);
                  handleDemographicsChange("role", "");
                }}>
                  <SelectTrigger id="department" className="h-10 rounded-xl" disabled={!formEnabled}>
                    <SelectValue placeholder="Selecione o setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <SelectItem value="no-departments" disabled>Nenhum setor disponível</SelectItem>
                    ) : (
                      departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Select value={demographics.role} onValueChange={(v) => handleDemographicsChange("role", v)} disabled={!demographics.department}>
                  <SelectTrigger id="role" className="h-10 rounded-xl" disabled={!formEnabled || !demographics.department}>
                    <SelectValue placeholder={demographics.department ? (availableRolesForDept.length ? "Selecione o cargo..." : "Nenhum cargo disponível") : "Selecione um setor primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRolesForDept.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seletor de Item GES/GHE */}
            {assessmentItems.length > 0 && (
              <div className={`space-y-2 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
                <Label htmlFor="assessmentItem">{typeLabel}</Label>
                <Select value={demographics.assessmentItem} onValueChange={(v) => handleDemographicsChange("assessmentItem", v)}>
                  <SelectTrigger id="assessmentItem" className="h-10 rounded-xl" disabled={!formEnabled}>
                    <SelectValue placeholder={`Selecione o ${typeLabel}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {assessmentItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                        {item.description && <span className="text-xs text-muted-foreground ml-2">- {item.description}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="text-center text-muted-foreground p-6">
            Nenhuma categoria de perguntas ativa encontrada para esta avaliação.
            Por favor, entre em contato com o administrador.
          </div>
        ) : currentStep > 0 && currentStep <= sortedCategories.length ? (
          <div className={`space-y-6 ${!formEnabled ? "pointer-events-none opacity-60" : ""}`}>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold">{currentCategory?.name}</h2>
              {currentCategory?.description && (
                <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
              )}
            </div>

            <div className="space-y-4">
              {currentQuestions.map((q) => (
                <Card key={q.id} className="p-4">
                  <p className="font-medium mb-3">{q.text}</p>
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(q.id, value)}
                    value={answers[q.id]?.questionId === q.id ? answers[q.id]?.answerValue.toString() : undefined}
                    className="flex flex-wrap gap-4"
                  >
                    {answerScale.map((s) => (
                      <div key={s.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={s.value.toString()} id={`q-${q.id}-s-${s.id}`} />
                        <Label htmlFor={`q-${q.id}-s-${s.id}`}>{s.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex justify-between">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          )}
          {currentStep < totalSteps - 1 ? (
            <Button onClick={handleNext} disabled={submitting}>
              Próxima <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Enviando..." : "Finalizar Avaliação"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EvaluationForm;