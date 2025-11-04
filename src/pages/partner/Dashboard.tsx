import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, ClipboardList, AlertTriangle, FileText, Star, BarChart3 } from "lucide-react"; // Adicionado FileText e Star
import { Link } from "react-router-dom";
import RecentActivity from "@/components/shared/RecentActivity";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import TrendAnalysisChart from "@/components/partner/charts/TrendAnalysisChart";
import EvolutionCompaniesResponses from "@/components/partner/charts/EvolutionCompaniesResponses";
import PlatformRatingDialog from "@/components/partner/PlatformRatingDialog"; // Importar o novo componente

type Company = { id: string; name: string; partner_id: string; created_at?: string };
type Employee = { id: string; company_id: string };
type Assessment = { id: string; partner_id?: string; company_id?: string; created_at?: string };
type Report = { id: string; partner_id?: string; company_id?: string; created_at?: string };
type UsageCounter = { partner_id: string; active_assessments_count?: number | null; active_assessments_limit?: number | null };

const Dashboard = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false); // Estado para o diálogo de avaliação
  const [usage, setUsage] = useState<UsageCounter | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1) Empresas do parceiro
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("id,name,partner_id,created_at")
          .eq("partner_id", partnerId);
        if (companiesError) throw companiesError;

        if (!mounted) return;
        setCompanies(companiesData ?? []);

        const companyIds = (companiesData ?? []).map(c => c.id);

        // 2) Funcionários apenas dessas empresas
        let employeesData: any[] = [];
        if (companyIds.length > 0) {
          const { data, error: employeesError } = await supabase
            .from("employees")
            .select("id,company_id")
            .in("company_id", companyIds);
          if (employeesError) throw employeesError;
          employeesData = data ?? [];
        }
        if (!mounted) return;
        setEmployees(employeesData);

        // 3) Avaliações do parceiro
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from("assessments")
          .select("id,partner_id,company_id,created_at")
          .eq("partner_id", partnerId);
        if (assessmentsError) throw assessmentsError;
        if (!mounted) return;
        setAssessments(assessmentsData ?? []);

        // 4) Denúncias do parceiro
        const { data: reportsData, error: reportsError } = await supabase
          .from("reports")
          .select("id,partner_id,company_id,created_at")
          .eq("partner_id", partnerId);
        if (reportsError) throw reportsError;
        if (!mounted) return;
        setReports(reportsData ?? []);

        // 5) Usage counters (limites/consumo de avaliações)
        const { data: usageRow } = await supabase
          .from("usage_counters")
          .select("partner_id, active_assessments_count, active_assessments_limit")
          .eq("partner_id", partnerId)
          .maybeSingle();
        if (!mounted) return;
        setUsage((usageRow as any) ?? null);
      } catch (error) {
        console.error("[Dashboard] Falha ao buscar dados reais:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [partnerId, supabase]);

  // Cálculos
  const companyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);

  const employeeCount = useMemo(
    () => employees.filter((e) => companyIds.has(e.company_id)).length,
    [employees, companyIds],
  );

  const assessmentsCount = assessments.length;
  const reportsCount = reports.length;
  const usedAssessments = (usage?.active_assessments_count ?? undefined) ?? assessmentsCount;
  const limitAssessments = usage?.active_assessments_limit ?? null;
  const progressPct = limitAssessments && limitAssessments > 0
    ? Math.min(100, Math.round((usedAssessments / limitAssessments) * 100))
    : null;

  // Empresas recentes (até 6) - ordenadas por data de criação
  const recentCompanies = useMemo(() => {
    const clone = [...companies];
    clone.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return clone.slice(0, 6);
  }, [companies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Painel</h1>
          <p className="text-sm text-muted-foreground">Resumo da sua conta</p>
        </div>
        <Button onClick={() => setIsRatingDialogOpen(true)} className="gap-2">
          <Star className="h-4 w-4" /> Avaliar Plataforma
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <Building2 size={18} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total de Empresas</div>
              <div className="text-2xl font-bold">{companies.length}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <Users size={18} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Colaboradores</div>
              <div className="text-2xl font-bold">{employeeCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
              <FileText size={18} /> {/* Ícone para Avaliações */}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avaliações Recebidas</div>
              <div className="text-2xl font-bold">{assessmentsCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-100 text-red-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Denúncias Recebidas</div>
              <div className="text-2xl font-bold">{reportsCount}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos: Tendências e Evolução */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendAnalysisChart />
        <EvolutionCompaniesResponses />
      </div>

      {/* Linha: Empresas Recentes, Atividade, Ações Rápidas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Empresas Recentes */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Empresas Recentes</h3>
            <Link to="/partner/empresas" className="text-xs text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {recentCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                </div>
                <Link to="/partner/empresas" className="text-xs text-blue-600 hover:underline">
                  Abrir
                </Link>
              </div>
            ))}
            {recentCompanies.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Nenhuma empresa cadastrada ainda.
              </div>
            )}
          </div>
        </Card>

        {/* Atividade Recente (reuso) */}
        <div className="lg:col-span-1">
          <RecentActivity partnerId={partnerId} />
        </div>

        {/* Ações Rápidas */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium">Ações Rápidas</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/partner/empresas">
              <Button variant="default">Gerenciar empresas</Button>
            </Link>
            <Link to="/partner/colaboradores">
              <Button variant="default">Colaboradores</Button>
            </Link>
            <Link to="/partner/avaliacoes"> {/* Atualizado para a lista de avaliações */}
              <Button variant="default">Avaliações</Button>
            </Link>
            <Link to="/partner/reports/overview"> {/* Atualizado para o relatório geral */}
              <Button variant="default">Relatórios</Button>
            </Link>
            <Link to="/partner/links">
              <Button variant="default">Links</Button>
            </Link>
          </div>
        </Card>
      </div>

      <PlatformRatingDialog
        open={isRatingDialogOpen}
        onOpenChange={setIsRatingDialogOpen}
      />
    </div>
  );
};

export default Dashboard;