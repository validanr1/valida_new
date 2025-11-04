import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/SupabaseProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

type Company = { id: string; name: string; partner_id: string };
type Category = { id: string; name: string; description?: string; order?: number };
type Question = { id: string; category_id?: string | null; text: string; kind?: "direct" | "inverse"; order?: number };
type ScaleItem = { id: string; label: string; value: number; order: number };
type Department = { id: string; name: string };
type Role = { id: string; name: string; department_id?: string };

interface Demographics {
  firstName: string;
  age: number | null;
  gender: string;
  department: string;
  role: string;
  ghe: string;
  ges: string;
}

interface Answer {
  questionId: string;
  answerValue: number;
  isInverse: boolean;
  scoredValue: number;
}

const GenerateDemoData = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const partnerId = session?.partner_id;
  const companyId = session?.company_id; // Use the currently selected company

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerScale, setAnswerScale] = useState<ScaleItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // IDs dos departamentos e cargos de demonstração
  const [demoDeptSaudeId, setDemoDeptSaudeId] = useState<string | null>(null);
  const [demoDeptEducacaoId, setDemoDeptEducacaoId] = useState<string | null>(null);
  const [demoDeptAdminId, setDemoDeptAdminId] = useState<string | null>(null);
  const [demoRoleAcsId, setDemoRoleAcsId] = useState<string | null>(null);
  const [demoRoleProfId, setDemoRoleProfId] = useState<string | null>(null);
  const [demoRoleAnalistaId, setDemoRoleAnalistaId] = useState<string | null>(null);

  // Helper para garantir que um departamento exista ou seja criado
  const ensureDemoDepartment = useCallback(async (companyId: string, deptName: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("departments")
      .upsert({ company_id: companyId, name: deptName }, { onConflict: 'company_id,name' })
      .select("id")
      .single();
    if (error) {
      console.error(`Error ensuring department ${deptName}:`, error);
      return null;
    }
    return data?.id || null;
  }, []);

  // Helper para garantir que um cargo exista ou seja criado
  const ensureDemoRole = useCallback(async (companyId: string, roleName: string, departmentId: string | null): Promise<string | null> => {
    const { data, error } = await supabase
      .from("roles")
      .upsert({ company_id: companyId, name: roleName, department_id: departmentId, status: 'active' }, { onConflict: 'company_id,name' })
      .select("id")
      .single();
    if (error) {
      console.error(`Error ensuring role ${roleName}:`, error);
      return null;
    }
    return data?.id || null;
  }, []);

  const fetchRequiredData = useCallback(async () => {
    if (!companyId || !partnerId) {
      showError("Nenhuma empresa selecionada ou ID de parceiro ausente na sessão.");
      setLoading(false);
      return;
    }

    try {
      const [{ data: companyData }, { data: questionsData }, { data: scaleData }] = await Promise.all([
        supabase.from("companies").select("id,name,partner_id").eq("id", companyId).maybeSingle(),
        supabase.from("questions").select("id,category_id,text,kind,order").eq("status", "active"),
        supabase.from("answer_scale").select("id,label,value,order").order("order", { ascending: true }),
      ]);

      if (!companyData) {
        showError("Empresa selecionada não encontrada.");
        setLoading(false);
        return;
      }

      setCompany(companyData as Company);
      setQuestions((questionsData as Question[]) || []);
      setAnswerScale((scaleData as ScaleItem[]) || []);

      // 1. Garantir que os departamentos de demonstração existam ou sejam criados
      const sSaudeId = await ensureDemoDepartment(companyData.id, 'Secretaria de Saúde');
      const sEducacaoId = await ensureDemoDepartment(companyData.id, 'Secretaria de Educação');
      const adminId = await ensureDemoDepartment(companyData.id, 'Administração');

      if (!sSaudeId || !sEducacaoId || !adminId) {
        showError("Falha ao criar/encontrar departamentos de demonstração.");
        setLoading(false);
        return;
      }
      setDemoDeptSaudeId(sSaudeId);
      setDemoDeptEducacaoId(sEducacaoId);
      setDemoDeptAdminId(adminId);

      // 2. Garantir que os cargos de demonstração existam ou sejam criados
      const acsId = await ensureDemoRole(companyData.id, 'Agente Comunitário de Saúde', sSaudeId);
      const profId = await ensureDemoRole(companyData.id, 'Professor', sEducacaoId);
      const analistaId = await ensureDemoRole(companyData.id, 'Analista Administrativo', adminId);

      if (!acsId || !profId || !analistaId) {
        showError("Falha ao criar/encontrar cargos de demonstração.");
        setLoading(false);
        return;
      }
      setDemoRoleAcsId(acsId);
      setDemoRoleProfId(profId);
      setDemoRoleAnalistaId(analistaId);

      // 3. Agora, buscar TODOS os departamentos e cargos para popular os estados
      const [{ data: departmentsData }, { data: rolesData }] = await Promise.all([
        supabase.from("departments").select("id,name").eq("company_id", companyData.id),
        supabase.from("roles").select("id,name,department_id").eq("company_id", companyData.id),
      ]);
      setDepartments((departmentsData as Department[]) || []);
      setRoles((rolesData as Role[]) || []);

    } catch (err) {
      console.error("Failed to fetch data for demo generation:", err);
      showError("Falha ao carregar dados necessários para gerar demonstração.");
    } finally {
      setLoading(false);
    }
  }, [companyId, partnerId, ensureDemoDepartment, ensureDemoRole]);

  useEffect(() => {
    fetchRequiredData();
  }, [fetchRequiredData]);

  const generateAssessment = async (targetScore: number, demoName: string, deptId: string, roleId: string) => {
    if (!company || questions.length === 0 || answerScale.length === 0) {
      showError("Dados insuficientes para gerar avaliação.");
      return false;
    }

    const demographics: Demographics = {
      firstName: demoName,
      age: 30,
      gender: "prefiro-nao-dizer",
      department: deptId,
      role: roleId,
      ghe: "GHE Demo",
      ges: "GES Demo",
    };

    const answers: Record<string, Answer> = {};
    questions.forEach(q => {
      const isInverse = q.kind === "inverse";
      let selectedValue: number;

      // Simple logic to approximate target score
      if (targetScore >= 75) { // Aim for green zone
        selectedValue = isInverse ? 0 : 100;
      } else if (targetScore >= 40) { // Aim for yellow zone
        selectedValue = isInverse ? 25 : 75;
      } else { // Aim for red zone
        selectedValue = isInverse ? 75 : 25;
      }

      // Find the closest actual scale value
      const closestScaleItem = answerScale.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.value - selectedValue);
        const currDiff = Math.abs(curr.value - selectedValue);
        return (currDiff < prevDiff ? curr : prev);
      });
      
      const finalAnswerValue = closestScaleItem.value;
      const scoredValue = isInverse ? 100 - finalAnswerValue : finalAnswerValue;

      answers[q.id] = {
        questionId: q.id,
        answerValue: finalAnswerValue,
        isInverse: isInverse,
        scoredValue: scoredValue,
      };
    });

    let totalScore = 0;
    let answeredQuestionsCount = 0;
    Object.values(answers).forEach((answer) => {
      totalScore += answer.scoredValue;
      answeredQuestionsCount++;
    });
    const averageScore = answeredQuestionsCount > 0 ? totalScore / answeredQuestionsCount : 0;

    // Mapear IDs de departamento e cargo para seus nomes antes de enviar
    const departmentName = departments.find(d => d.id === demographics.department)?.name || demographics.department;
    const roleName = roles.find(r => r.id === demographics.role)?.name || demographics.role;

    // 1. Insert into assessments table
    const { data: assessmentData, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        partner_id: company.partner_id,
        company_id: company.id,
        first_name: demographics.firstName || null,
        age: demographics.age || null,
        gender: demographics.gender || null,
        department: departmentName || null,
        role: roleName || null,
        ghe: demographics.ghe || null,
        ges: demographics.ges || null,
        status: "completed",
        score: Number(averageScore.toFixed(1)) || null,
      })
      .select("id")
      .single();

    if (assessmentError) {
      console.error(`[GenerateDemoData] Erro ao inserir na tabela 'assessments' para ${demoName}:`, assessmentError);
      showError(`Falha ao gerar avaliação para ${demoName}.`);
      return false;
    }
    const assessmentId = assessmentData.id;

    // 2. Insert into assessment_responses table for each answer
    const responsesToInsert = Object.entries(answers).map(([questionId, answer]) => ({
      assessment_id: assessmentId,
      question_id: questionId,
      answer_value: answer.answerValue,
      is_inverse: answer.isInverse,
      scored_value: answer.scoredValue,
    }));

    const { error: responsesError } = await supabase
      .from("assessment_responses")
      .insert(responsesToInsert);

    if (responsesError) {
      console.error(`[GenerateDemoData] Erro ao inserir na tabela 'assessment_responses' para ${demoName}:`, responsesError);
      showError(`Falha ao gerar respostas da avaliação para ${demoName}.`);
      return false;
    }
    return true;
  };

  const handleGenerateAllDemoData = async () => {
    setGenerating(true);
    if (!company || !demoDeptSaudeId || !demoDeptEducacaoId || !demoDeptAdminId || !demoRoleAcsId || !demoRoleProfId || !demoRoleAnalistaId) {
      showError("Dados de empresa, departamentos ou cargos de demonstração não carregados. Não é possível gerar dados de demonstração.");
      setGenerating(false);
      return;
    }

    const assessmentsToGenerate = [
      { score: 35, name: "Colaborador A", deptId: demoDeptSaudeId, roleId: demoRoleAcsId }, // Red Zone
      { score: 60, name: "Colaborador B", deptId: demoDeptEducacaoId, roleId: demoRoleProfId }, // Yellow Zone
      { score: 88, name: "Colaborador C", deptId: demoDeptAdminId, roleId: demoRoleAnalistaId }, // Green Zone
      { score: 45, name: "Colaborador D", deptId: demoDeptSaudeId, roleId: demoRoleAcsId }, // Yellow Zone
      { score: 78, name: "Colaborador E", deptId: demoDeptEducacaoId, roleId: demoRoleProfId }, // Green Zone
      { score: 28, name: "Colaborador F", deptId: demoDeptAdminId, roleId: demoRoleAnalistaId }, // Red Zone
    ];

    let successCount = 0;
    for (const assessment of assessmentsToGenerate) {
      console.log(`[GenerateDemoData] Attempting to generate assessment for: ${assessment.name}`);
      const success = await generateAssessment(assessment.score, assessment.name, assessment.deptId, assessment.roleId);
      if (success) {
        successCount++;
        console.log(`[GenerateDemoData] Successfully generated assessment for: ${assessment.name}`);
      } else {
        console.error(`[GenerateDemoData] Failed to generate assessment for: ${assessment.name}`);
      }
    }

    if (successCount === assessmentsToGenerate.length) {
      showSuccess("Todos os dados de demonstração foram gerados com sucesso!");
      navigate(`/partner/reports/overview`); // Redirect to reports overview
    } else {
      showError(`Apenas ${successCount} de ${assessmentsToGenerate.length} avaliações foram geradas com sucesso.`);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando dados para geração...</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para gerar dados de demonstração.</div>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Empresa selecionada não encontrada.</div>
      </Card>
    );
  }

  if (questions.length === 0 || answerScale.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">
          Dados essenciais (perguntas ou escala de respostas) não encontrados para a empresa.
          Certifique-se de que o questionário está configurado.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Gerar Dados de Demonstração</h1>
      <p className="text-muted-foreground">
        Esta ferramenta irá gerar avaliações de exemplo para a empresa "{company.name}"
        para que você possa visualizar os relatórios.
      </p>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Confirmação</h2>
        <p className="mb-4">
          Ao clicar no botão abaixo, serão criadas múltiplas avaliações e suas respostas
          associadas à empresa "{company.name}". Isso é útil para popular o sistema
          e testar as funcionalidades de relatório.
        </p>
        <Button onClick={handleGenerateAllDemoData} disabled={generating}>
          {generating ? "Gerando..." : "Gerar Dados de Demonstração"}
        </Button>
      </Card>
    </div>
  );
};

export default GenerateDemoData;