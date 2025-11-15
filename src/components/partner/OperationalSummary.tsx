import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { ClipboardCheck, UserPlus, Building2, AlertTriangle } from "lucide-react";

type Metric = { label: string; value: number; delta?: number; icon: any; color: string };

const OperationalSummary = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    if (!partnerId) { setMetrics([]); return; }
    let mounted = true;
    (async () => {
      const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

      // 1) Avaliações concluídas hoje (status='completed' e created_at>=startOfToday)
      let aQuery = supabase
        .from("assessments")
        .select("id,created_at,status")
        .eq("partner_id", partnerId)
        .eq("status", "completed");
      if (companyId) aQuery = aQuery.eq("company_id", companyId);
      const { data: todayAssessments } = await aQuery.gte("created_at", startOfToday.toISOString());
      const assessmentsToday = (todayAssessments ?? []).length;

      // 2) Colaboradores adicionados hoje
      let empQuery = supabase
        .from("employees")
        .select("id,company_id,created_at");
      if (companyId) {
        empQuery = empQuery.eq("company_id", companyId);
      } else {
        const { data: companies } = await supabase.from("companies").select("id").eq("partner_id", partnerId);
        const companyIds = (companies ?? []).map((c: any) => c.id);
        if (companyIds.length > 0) empQuery = empQuery.in("company_id", companyIds);
        else empQuery = empQuery.eq("company_id", "__none__");
      }
      const { data: todayEmployees } = await empQuery.gte("created_at", startOfToday.toISOString());
      const employeesToday = (todayEmployees ?? []).length;

      // 3) Novas empresas no mês
      const { data: monthCompanies } = await supabase
        .from("companies")
        .select("id,created_at")
        .eq("partner_id", partnerId)
        .gte("created_at", startOfMonth.toISOString());
      const companiesMonth = (monthCompanies ?? []).length;

      // 4) Denúncias pendentes (treated=false)
      let repQuery = supabase
        .from("reports")
        .select("id,treated,partner_id,company_id")
        .eq("partner_id", partnerId)
        .eq("treated", false);
      if (companyId) repQuery = repQuery.eq("company_id", companyId);
      const { data: pendingReports } = await repQuery;
      const reportsPending = (pendingReports ?? []).length;

      const list: Metric[] = [
        { label: "Avaliações Concluídas Hoje", value: assessmentsToday, icon: ClipboardCheck, color: "#1DB584" },
        { label: "Colaboradores Adicionados", value: employeesToday, icon: UserPlus, color: "#2563EB" },
        { label: "Novas Empresas no Mês", value: companiesMonth, icon: Building2, color: "#8B5CF6" },
        { label: "Denúncias Pendentes", value: reportsPending, icon: AlertTriangle, color: "#EF4444" },
      ];
      if (mounted) setMetrics(list);
    })();
    return () => { mounted = false; };
  }, [partnerId, companyId]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metrics.map((m) => (
        <Card key={m.label} className="p-4 rounded-2xl shadow-md border hover:shadow-lg transition-transform duration-200 hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: `${m.color}22`, color: m.color }}>
              <m.icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{m.label}</div>
              <div className="text-2xl font-bold">{m.value}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default OperationalSummary;