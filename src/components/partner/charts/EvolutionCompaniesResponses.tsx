"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tabela companies tem created_at. assessment_responses não possui created_at,
// então usamos o created_at do assessment ao qual a resposta pertence.

type Company = { id: string; partner_id: string; created_at: string };
type Assessment = { id: string; partner_id: string; company_id: string; created_at: string };

type ChartPoint = { name: string; companies: number; responses: number };

const EvolutionCompaniesResponses = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!partnerId) {
      setData([]);
      return;
    }

    let mounted = true;
    (async () => {
      // 1) Empresas do parceiro (ou da empresa selecionada se fizer sentido - aqui é consolidado por parceiro)
      const { data: companiesRows, error: compErr } = await supabase
        .from("companies")
        .select("id,partner_id,created_at")
        .eq("partner_id", partnerId);
      if (compErr) {
        console.error("[EvolutionCompaniesResponses] Erro companies:", compErr);
        return;
      }

      // 2) Avaliações do parceiro (filtrar por empresa se houver selecionada)
      let aQuery = supabase
        .from("assessments")
        .select("id,partner_id,company_id,created_at")
        .eq("partner_id", partnerId);
      if (companyId) aQuery = aQuery.eq("company_id", companyId);
      const { data: assessmentsRows, error: assErr } = await aQuery;
      if (assErr) {
        console.error("[EvolutionCompaniesResponses] Erro assessments:", assErr);
        return;
      }

      const assessmentIds = (assessmentsRows ?? []).map((a) => a.id);

      // 3) Respostas das avaliações do parceiro (contamos por mês do assessment)
      let responsesCountByAssessment: Record<string, number> = {};
      if (assessmentIds.length > 0) {
        const { data: respRows, error: respErr } = await supabase
          .from("assessment_responses")
          .select("assessment_id").in("assessment_id", assessmentIds);
        if (respErr) {
          console.error("[EvolutionCompaniesResponses] Erro assessment_responses:", respErr);
          return;
        }
        (respRows ?? []).forEach((r: any) => {
          const id = r.assessment_id as string;
          responsesCountByAssessment[id] = (responsesCountByAssessment[id] || 0) + 1;
        });
      }

      // 4) Buckets mensais yyyy-MM
      const monthly: Record<string, { companies: number; responses: number }> = {};

      (companiesRows ?? []).forEach((c) => {
        try {
          const d = new Date((c as Company).created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!monthly[key]) monthly[key] = { companies: 0, responses: 0 };
          monthly[key].companies += 1;
        } catch {}
      });

      (assessmentsRows ?? []).forEach((a) => {
        try {
          const d = new Date((a as Assessment).created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!monthly[key]) monthly[key] = { companies: 0, responses: 0 };
          monthly[key].responses += responsesCountByAssessment[(a as Assessment).id] || 0;
        } catch {}
      });

      const sorted = Object.keys(monthly).sort();
      const chartData: ChartPoint[] = sorted.map((k) => {
        const [y, m] = k.split("-").map(Number);
        const label = format(new Date(y, (m || 1) - 1, 1), "MMM/yyyy", { locale: ptBR });
        return { name: label, companies: monthly[k].companies, responses: monthly[k].responses };
      });

      if (mounted) setData(chartData);
    })();

    return () => {
      mounted = false;
    };
  }, [partnerId, companyId]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Evolução - Empresas e Respostas</h3>
          <p className="text-xs text-muted-foreground">
            {companyId ? "Filtrado pela empresa selecionada" : "Consolidado do parceiro"}
          </p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradCompanies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="gradResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="companies" name="Empresas" stroke="#2563EB" fill="url(#gradCompanies)" strokeWidth={2} />
            <Area type="monotone" dataKey="responses" name="Respostas" stroke="#10B981" fill="url(#gradResponses)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EvolutionCompaniesResponses;
