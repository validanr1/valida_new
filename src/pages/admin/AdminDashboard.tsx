import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import StatCard from "@/components/admin/StatCard";
import EmployeesPerCompanyChart from "@/components/admin/EmployeesPerCompanyChart";
import RecentActivity from "@/components/shared/RecentActivity";
import { Building2, CreditCard, LayoutGrid, Users, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import SegmentDistributionChart from "@/components/admin/charts/SegmentDistributionChart";
import CompanyAssessmentEvolutionChart from "@/components/admin/charts/CompanyAssessmentEvolutionChart";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Partner = { id: string; name: string; status?: "active" | "inactive"; created_at: string };
type Company = { id: string; name: string; partner_id: string; created_at: string };
type Profile = { id: string; created_at: string };
type Plan = {
  id: string;
  name: string;
  period: "monthly" | "quarterly" | "semiannual" | "yearly";
  total_price?: number | null;
};
type PlanAssignment = { id: string; partner_id: string; plan_id: string };

const AdminDashboard = () => {
  console.log("AdminDashboard: Componente AdminDashboard renderizando.");
  const { session } = useSession(); // Use the reactive session
  const [partnersCount, setPartnersCount] = useState(0);
  const [partnersThisMonth, setPartnersThisMonth] = useState(0);
  const [activeCompaniesCount, setActiveCompaniesCount] = useState(0);
  const [companiesThisWeek, setCompaniesThisWeek] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [usersThisMonth, setUsersThisMonth] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [revenueChangePercent, setRevenueChangePercent] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadCounts() {
    console.log("AdminDashboard: Iniciando loadCounts...");
    setLoading(true);
    try {
      const now = new Date();
      const startOfCurrentMonth = format(startOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const endOfCurrentMonth = format(endOfMonth(now), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const startOfCurrentWeek = format(startOfWeek(now, { locale: ptBR }), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const endOfCurrentWeek = format(endOfWeek(now, { locale: ptBR }), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const startOfPreviousMonth = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const endOfPreviousMonth = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

      const [
        { count: pCount, error: pError },
        { count: pMonthCount, error: pMonthError },
        { count: cCount, error: cError },
        { count: cWeekCount, error: cWeekError },
        { count: uCount, error: uError },
        { count: uMonthCount, error: uMonthError },
      ] = await Promise.all([
        supabase.from("partners").select("*", { count: "exact", head: true }),
        supabase.from("partners").select("*", { count: "exact", head: true }).gte("created_at", startOfCurrentMonth).lte("created_at", endOfCurrentMonth),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }).gte("created_at", startOfCurrentWeek).lte("created_at", endOfCurrentWeek),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfCurrentMonth).lte("created_at", endOfCurrentMonth),
      ]);

      if (pError) console.error("Dashboard Error (Partners):", pError.message);
      setPartnersCount(pCount ?? 0);
      if (pMonthError) console.error("Dashboard Error (Partners This Month):", pMonthError.message);
      setPartnersThisMonth(pMonthCount ?? 0);

      if (cError) console.error("Dashboard Error (Companies):", cError.message);
      setActiveCompaniesCount(cCount ?? 0);
      if (cWeekError) console.error("Dashboard Error (Companies This Week):", cWeekError.message);
      setCompaniesThisWeek(cWeekCount ?? 0);

      if (uError) console.error("Dashboard Error (Users):", uError.message);
      setTotalUsersCount(uCount ?? 0);
      if (uMonthError) console.error("Dashboard Error (Users This Month):", uMonthError.message);
      setUsersThisMonth(uMonthCount ?? 0);

      // Calculate Monthly Revenue and Previous Month Revenue
      const { data: assignments, error: assignError } = await supabase
        .from("plan_assignments")
        .select("plan_id");
      const { data: plans, error: plansError } = await supabase
        .from("plans")
        .select("id,period,total_price");

      if (assignError) console.error("Dashboard Error (Plan Assignments):", assignError.message);
      if (plansError) console.error("Dashboard Error (Plans):", plansError.message);

      let currentMonthRevenue = 0;
      let previousMonthRevenue = 0;

      if (assignments && plans) {
        const plansMap = new Map<string, Plan>();
        plans.forEach(p => plansMap.set(p.id, p as Plan));

        assignments.forEach(assignment => {
          const plan = plansMap.get(assignment.plan_id);
          if (plan && typeof plan.total_price === 'number') {
            const monthlyValue = plan.total_price / (
              plan.period === "monthly" ? 1 :
              plan.period === "quarterly" ? 3 :
              plan.period === "semiannual" ? 6 :
              plan.period === "yearly" ? 12 : 1
            );
            currentMonthRevenue += monthlyValue;
            previousMonthRevenue += monthlyValue; // Assuming recurring revenue for simplicity
          }
        });
      }
      setMonthlyRevenue(currentMonthRevenue);

      if (previousMonthRevenue > 0) {
        const change = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
        setRevenueChangePercent(change);
      } else {
        setRevenueChangePercent(currentMonthRevenue > 0 ? 100 : 0); // If no previous revenue, but current exists, it's 100% increase
      }
      console.log("AdminDashboard: loadCounts finalizado com sucesso.");

    } catch (err) {
      console.error("A critical error occurred while loading dashboard stats:", err);
      showError("Falha ao carregar algumas estatísticas do painel.");
    } finally {
      setLoading(false);
      console.log("AdminDashboard: loadCounts finalizado. Loading:", false);
    }
  }

  useEffect(() => {
    loadCounts();
  }, [session?.user_id]); // Depend on session.user_id to re-fetch data if user changes

  const quickLinks = useMemo(
    () => [
      { to: "/admin/parceiros", label: "Gerenciar parceiros", icon: <Users size={16} /> },
      { to: "/admin/planos", label: "Planos e preços", icon: <CreditCard size={16} /> },
      { to: "/admin/empresas", label: "Empresas", icon: <Building2 size={16} /> },
    ],
    [],
  );

  const refresh = () => {
    loadCounts().then(() => {
      showSuccess("Dashboard atualizado.");
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
            <LayoutGrid size={18} />
          </div>
          <h1 className="text-xl font-semibold">Painel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
        <StatCard 
          title="Total de Parceiros" 
          value={loading ? "..." : partnersCount} 
          icon={<Users size={18} />} 
          helperText={loading ? "..." : `${partnersThisMonth} este mês`}
        />
        <StatCard 
          title="Empresas Ativas" 
          value={loading ? "..." : activeCompaniesCount} 
          icon={<Building2 size={18} />} 
          helperText={loading ? "..." : `${companiesThisWeek} esta semana`}
        />
        <StatCard 
          title="Usuários Totais" 
          value={loading ? "..." : totalUsersCount} 
          icon={<LayoutGrid size={18} />} 
          helperText={loading ? "..." : `${usersThisMonth} este mês`}
        />
        <StatCard 
          title="Receita Mensal" 
          value={loading ? "..." : formatCurrency(monthlyRevenue)} 
          icon={<DollarSign size={18} />} 
          helperText={loading ? "..." : `${revenueChangePercent.toFixed(1)}% vs mês anterior`}
        />
      </div>

      {/* Conteúdo principal - Gráficos e Atividade Recente */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4">
          <CompanyAssessmentEvolutionChart />
          <div className="grid gap-4 md:grid-cols-2">
            <EmployeesPerCompanyChart />
            <SegmentDistributionChart />
          </div>
        </div>
        {/* Coluna para Atividade Recente e Ações Rápidas */}
        <div className="lg:col-span-1 grid gap-4">
          <RecentActivity />
          <Card className="p-4">
            <div className="mb-3 text-sm font-medium">Ações rápidas</div>
            <div className="flex flex-wrap items-center gap-2">
              {quickLinks.map((q) => (
                <Link to={q.to} key={q.to}>
                  <Button variant="default" className="gap-2">
                    {q.icon}
                    {q.label}
                  </Button>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;