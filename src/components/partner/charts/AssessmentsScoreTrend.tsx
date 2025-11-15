"use client";

import { useEffect, useState } from "react";
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
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Assessment = { id: string; partner_id?: string; company_id?: string; score?: number | null; created_at: string };

type ChartPoint = { name: string; responses: number; avgScore: number };

const AssessmentsScoreTrend = () => {
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
      // 1) Avaliações do parceiro (filtra por empresa se houver)
      let aQuery = supabase
        .from("assessments")
        .select("id,partner_id,company_id,score,created_at")
        .eq("partner_id", partnerId);
      if (companyId) aQuery = aQuery.eq("company_id", companyId);
      const { data: assessmentsRows, error: assErr } = await aQuery;
      if (assErr) {
        console.error("[AssessmentsScoreTrend] Erro assessments:", assErr);
        return;
      }
      const assessments = (assessmentsRows ?? []) as Assessment[];

      // 2) Respostas por avaliação
      const assessmentIds = assessments.map((a) => a.id);
      let responsesCountByAssessment: Record<string, number> = {};
      if (assessmentIds.length > 0) {
        const { data: respRows, error: respErr } = await supabase
          .from("assessment_responses")
          .select("assessment_id")
          .in("assessment_id", assessmentIds);
        if (respErr) {
          console.error("[AssessmentsScoreTrend] Erro assessment_responses:", respErr);
        } else {
          (respRows ?? []).forEach((r: any) => {
            const id = r.assessment_id as string;
            responsesCountByAssessment[id] = (responsesCountByAssessment[id] || 0) + 1;
          });
        }
      }

      // 3) Buckets mensais yyyy-MM para respostas e média de score
      const monthly: Record<string, { responses: number; scoreSum: number; scoreCount: number }> = {};
      assessments.forEach((a) => {
        try {
          const d = new Date(a.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!monthly[key]) monthly[key] = { responses: 0, scoreSum: 0, scoreCount: 0 };
          monthly[key].responses += responsesCountByAssessment[a.id] || 0;
          if (typeof a.score === "number") {
            monthly[key].scoreSum += a.score;
            monthly[key].scoreCount += 1;
          }
        } catch {}
      });

      const sorted = Object.keys(monthly).sort();
      const chartData: ChartPoint[] = sorted.map((k) => {
        const [y, m] = k.split("-").map(Number);
        const label = format(new Date(y, (m || 1) - 1, 1), "MMM/yyyy", { locale: ptBR });
        const bucket = monthly[k];
        const avg = bucket.scoreCount > 0 ? bucket.scoreSum / bucket.scoreCount : 0;
        return { name: label, responses: bucket.responses, avgScore: Number(avg.toFixed(1)) };
      });

      if (mounted) setData(chartData);
    })();

    return () => { mounted = false; };
  }, [partnerId, companyId]);

  return (
    <Card className="p-6 rounded-2xl shadow-md">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Tendência de Avaliações e Score</h3>
        <p className="text-xs text-muted-foreground">
          {companyId ? "Filtrado pela empresa selecionada" : "Consolidado do parceiro"}
        </p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1DB584" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#1DB584" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeOpacity: 0.15 }} />
            <Legend />
            <Area type="monotone" yAxisId="left" dataKey="responses" name="Respostas" stroke="#1DB584" fill="url(#gradResponses)" strokeWidth={2} />
            <Line type="monotone" yAxisId="right" dataKey="avgScore" name="Score médio" stroke="#0E3A4D" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AssessmentsScoreTrend;