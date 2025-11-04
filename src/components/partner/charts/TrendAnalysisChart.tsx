"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

type Assessment = { id: string; partner_id?: string; company_id?: string; score?: number | null; created_at: string };

const TrendAnalysisChart = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [data, setData] = useState<Array<{ name: string; assessments: number; avgScore: number }>>([]);

  useEffect(() => {
    if (!partnerId) {
      setData([]);
      return;
    }

    let mounted = true;
    (async () => {
      // Base: todas as avaliações do parceiro
      let query = supabase.from("assessments").select("id,partner_id,company_id,score,created_at").eq("partner_id", partnerId);

      // Se houver empresa selecionada, filtra por ela
      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.error("[TrendAnalysisChart] Erro ao buscar avaliações:", error);
        return;
      }

      const items = (rows ?? []) as Assessment[];
      const monthly: Record<string, { count: number; scoreSum: number; scoreCount: number }> = {};

      items.forEach((a) => {
        try {
          const d = new Date(a.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // yyyy-MM
          if (!monthly[key]) monthly[key] = { count: 0, scoreSum: 0, scoreCount: 0 };
          monthly[key].count += 1;
          if (typeof a.score === "number") {
            monthly[key].scoreSum += a.score;
            monthly[key].scoreCount += 1;
          }
        } catch (e) {
          // ignora datas inválidas
        }
      });

      // Ordena por mês cronologicamente
      const sortedKeys = Object.keys(monthly).sort(); // yyyy-MM ordena lexicograficamente

      const chartData = sortedKeys.map((k) => {
        const bucket = monthly[k];
        const [y, m] = k.split('-').map(Number);
        const label = format(new Date(y, (m || 1) - 1, 1), 'MMM/yyyy', { locale: ptBR });
        const avg = bucket.scoreCount > 0 ? bucket.scoreSum / bucket.scoreCount : 0;
        return { name: label, assessments: bucket.count, avgScore: Number(avg.toFixed(1)) };
      });

      if (mounted) setData(chartData);
    })();

    return () => {
      mounted = false;
    };
  }, [partnerId, companyId]);

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium">Análise de Tendências</h3>
        <p className="text-xs text-muted-foreground">
          {companyId ? "Filtrado pela empresa selecionada" : "Consolidado do parceiro"}
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="assessments" name="Avaliações" fill="#1DB584" radius={[4,4,0,0]} />
            <Bar yAxisId="right" dataKey="avgScore" name="Média de Score" fill="#0E3A4D" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TrendAnalysisChart;