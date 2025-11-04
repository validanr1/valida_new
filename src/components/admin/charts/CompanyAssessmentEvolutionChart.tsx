"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Company = { id: string; created_at: string };
type Assessment = { id: string; created_at: string };

const CompanyAssessmentEvolutionChart = () => {
  const [data, setData] = useState<Array<{ name: string; companies: number; assessments: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: companies, error: compError }, { data: assessments, error: assError }] = await Promise.all([
        supabase.from("companies").select("id,created_at"),
        supabase.from("assessments").select("id,created_at"),
      ]);

      if (compError) console.error("Error fetching companies for evolution chart:", compError);
      if (assError) console.error("Error fetching assessments for evolution chart:", assError);
      if (!mounted) return;

      const comps = (companies ?? []) as Company[];
      const ass = (assessments ?? []) as Assessment[];

      const monthlyData: Record<string, { companies: number; assessments: number }> = {};

      const processEntry = (dateString: string, type: "companies" | "assessments") => {
        try {
          const date = new Date(dateString);
          const monthYear = format(date, "MMM/yyyy", { locale: ptBR });
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { companies: 0, assessments: 0 };
          }
          monthlyData[monthYear][type]++;
        } catch (e) {
          console.warn("Invalid date format in evolution chart:", dateString, e);
        }
      };

      comps.forEach((c) => processEntry(c.created_at, "companies"));
      ass.forEach((a) => processEntry(a.created_at, "assessments"));

      const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
        const [monthA, yearA] = a.split("/");
        const [monthB, yearB] = b.split("/");
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateA.getTime() - dateB.getTime();
      });

      const chartData = sortedKeys.map((key) => ({
        name: key,
        companies: monthlyData[key].companies,
        assessments: monthlyData[key].assessments,
      }));

      setData(chartData);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Evolução - Empresas vs Respostas</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="companies" stroke="#0E3A4D" name="Empresas" />
            <Line type="monotone" dataKey="assessments" stroke="#1DB584" name="Avaliações" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CompanyAssessmentEvolutionChart;