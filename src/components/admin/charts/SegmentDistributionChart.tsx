"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Company = { id: string; cnae?: string | null };

const COLORS = ["#0E3A4D", "#1DB584", "#E66BFF", "#FFC107", "#00BCD4", "#FF5722", "#9C27B0", "#03A9F4"];

const MAX_SEGMENTS = 6;

function extractSegment(cnae?: string | null) {
  if (!cnae) return "Não informado";
  // Tenta usar a parte antes de " - " (ex.: "8121-4/00")
  const part = cnae.split(" - ")[0]?.trim() || cnae.trim();
  // Encurta rótulos muito longos para não quebrar layout do gráfico/legenda
  const short = part.length > 16 ? part.slice(0, 15) + "…" : part;
  return short || "Não informado";
}

const SegmentDistributionChart = () => {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id,cnae");

      if (error) {
        console.error("Error fetching companies for segment distribution:", error);
        return;
      }

      if (!mounted) return;

      const comps = (companies ?? []) as Company[];
      const counts: Record<string, number> = {};

      comps.forEach((c) => {
        const seg = extractSegment(c.cnae);
        counts[seg] = (counts[seg] ?? 0) + 1;
      });

      const entries = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const top = entries.slice(0, MAX_SEGMENTS);
      const rest = entries.slice(MAX_SEGMENTS);
      const othersSum = rest.reduce((acc, cur) => acc + cur.value, 0);
      const finalData = othersSum > 0 ? [...top, { name: "Outros", value: othersSum }] : top;

      setData(finalData);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Distribuição por Segmento</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              // Mostra apenas a porcentagem na fatia para evitar labels longos quebrando
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SegmentDistributionChart;