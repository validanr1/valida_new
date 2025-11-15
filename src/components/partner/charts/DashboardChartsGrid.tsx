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
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Assessment = { id: string; company_id?: string; status?: string; score?: number | null; created_at: string };
type Company = { id: string; name: string };

const COLORS = ["#1DB584", "#2563EB", "#8B5CF6", "#F59E0B", "#EF4444", "#22D3EE", "#A3E635"]; // paleta viva
const ZONE_COLORS = ["#EF4444", "#F59E0B", "#10B981"]; // vermelho, amarelo, verde

const RadialTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const name = item?.payload?.name ?? "";
  const value = item?.value ?? 0;
  return (
    <div className="rounded-md border bg-white px-2 py-1 text-xs">
      <div className="font-medium">{name}</div>
      <div>Valor: {value}</div>
    </div>
  );
};

const DashboardChartsGrid = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [monthlyResponses, setMonthlyResponses] = useState<Array<{ name: string; responses: number }>>([]);
  const [statusDist, setStatusDist] = useState<Array<{ name: string; value: number }>>([]); // deprecated (não usado)
  const [topCompanies, setTopCompanies] = useState<Array<{ name: string; value: number }>>([]);
  const [scoreBins, setScoreBins] = useState<Array<{ name: string; value: number }>>([]);
  const [stackedMonthlyByCompany, setStackedMonthlyByCompany] = useState<Array<Record<string, any>>>([]);
  const [categoryDist, setCategoryDist] = useState<Array<{ name: string; value: number }>>([]);
  const [answersDist, setAnswersDist] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    if (!partnerId) { setMonthlyResponses([]); setStatusDist([]); setTopCompanies([]); setScoreBins([]); return; }
    let mounted = true;
    (async () => {
      // Fetch assessments for partner (optionally by company)
      let aQuery = supabase
        .from("assessments")
        .select("id,company_id,status,score,created_at")
        .eq("partner_id", partnerId);
      if (companyId) aQuery = aQuery.eq("company_id", companyId);
      const { data: assessmentsRows } = await aQuery;
      const assessments = (assessmentsRows ?? []) as Assessment[];

      // Responses per assessment
      const ids = assessments.map(a => a.id);
      const { data: respRows } = ids.length > 0
        ? await supabase.from("assessment_responses").select("assessment_id,question_id,answer_value").in("assessment_id", ids)
        : { data: [] } as any;
      const respCountByAssessment: Record<string, number> = {};
      (respRows ?? []).forEach((r: any) => { respCountByAssessment[r.assessment_id] = (respCountByAssessment[r.assessment_id] || 0) + 1; });

      // A) Monthly responses (yyyy-MM)
      const monthly: Record<string, number> = {};
      assessments.forEach((a) => {
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + (respCountByAssessment[a.id] || 0);
      });
      const monthsSorted = Object.keys(monthly).sort().slice(-12);
      const monthlyResponsesData = monthsSorted.map(k => ({
        name: format(new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 1), 'MMM/yyyy', { locale: ptBR }),
        responses: monthly[k],
      }));

      // C) Top companies by assessments count
      const countByCompany: Record<string, number> = {};
      assessments.forEach(a => { if (a.company_id) countByCompany[a.company_id] = (countByCompany[a.company_id] || 0) + 1; });
      const topIds = Object.entries(countByCompany)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
      let namesById: Record<string, string> = {};
      if (topIds.length > 0) {
        const { data: companies } = await supabase.from("companies").select("id,name").in("id", topIds);
        (companies ?? []).forEach((c: any) => { namesById[c.id] = c.name; });
      }
      const topCompaniesData = Object.entries(countByCompany)
        .filter(([id]) => topIds.includes(id))
        .map(([id, v]) => ({ name: namesById[id] || id, value: v }))
        .sort((a, b) => b.value - a.value);

      // D) Monthly responses stacked by top companies
      const monthsForStack = monthsSorted; // reuse last 12 months keys
      const stacked: Array<Record<string, any>> = monthsForStack.map((k) => {
        const [y, m] = k.split('-').map(Number);
        const label = format(new Date(y, (m || 1) - 1, 1), 'MMM/yyyy', { locale: ptBR });
        const row: Record<string, any> = { name: label };
        topIds.forEach((id) => {
          const compName = namesById[id] || id;
          row[compName] = 0;
        });
        return row;
      });
      const monthIndex: Record<string, number> = {};
      monthsForStack.forEach((k, idx) => { monthIndex[k] = idx; });
      assessments.forEach((a) => {
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const idx = monthIndex[key];
        if (idx === undefined) return;
        const compId = a.company_id || "";
        if (!topIds.includes(compId)) return; // count only top companies
        const compName = namesById[compId] || compId;
        const resp = respCountByAssessment[a.id] || 0;
        stacked[idx][compName] = (stacked[idx][compName] || 0) + resp;
      });

      // E) Score distribution zones (Red: 0–39.99, Yellow: 40–74.99, Green: 75–100)
      const zoneCounts: Record<"red"|"yellow"|"green", number> = { red: 0, yellow: 0, green: 0 };
      assessments.forEach(a => {
        const s = typeof a.score === "number" ? a.score! : null;
        if (s === null || isNaN(s)) return;
        if (s < 40) zoneCounts.red++;
        else if (s < 75) zoneCounts.yellow++;
        else zoneCounts.green++;
      });
      const scoreBinsData = [
        { name: "Zona Vermelha (0%–39.99%)", value: zoneCounts.red },
        { name: "Zona Amarela (40%–74.99%)", value: zoneCounts.yellow },
        { name: "Zona Verde (75%–100%)", value: zoneCounts.green },
      ];

      // F) Category distribution for selected company (donut)
      const questionIds = Array.from(new Set(((respRows ?? []) as any[]).map((r: any) => r.question_id).filter(Boolean)));
      let categoryData: Array<{ name: string; value: number }> = [];
      let answersData: Array<{ name: string; value: number }> = [];
      if (questionIds.length > 0) {
        const { data: qRows } = await supabase.from("questions").select("id,category_id").in("id", questionIds);
        const categoryByQuestion: Record<string, string> = {};
        (qRows ?? []).forEach((q: any) => { categoryByQuestion[q.id] = q.category_id; });
        const categoryCount: Record<string, number> = {};
        (respRows ?? []).forEach((r: any) => {
          const cat = categoryByQuestion[r.question_id];
          if (!cat) return;
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        const catIds = Object.keys(categoryCount);
        if (catIds.length > 0) {
          const { data: catRows } = await supabase.from("question_categories").select("id,name").in("id", catIds);
          const namesByCat: Record<string, string> = {};
          (catRows ?? []).forEach((c: any) => { namesByCat[c.id] = c.name; });
          categoryData = catIds.map((id) => ({ name: namesByCat[id] || id, value: categoryCount[id] }));
        }

        // Answers distribution (by scale value) for selected company
        const counts: Record<string, number> = {};
        (respRows ?? []).forEach((r: any) => {
          const v = String(r.answer_value);
          counts[v] = (counts[v] || 0) + 1;
        });
        const { data: scaleRows } = await supabase
          .from("answer_scale")
          .select("label,value,order")
          .order("order", { ascending: true });
        const labelByValue: Record<string, string> = {};
        (scaleRows ?? []).forEach((s: any) => { labelByValue[String(s.value)] = s.label; });
        answersData = Object.keys(counts)
          .sort((a, b) => Number(a) - Number(b))
          .map((v) => ({ name: labelByValue[v] || v, value: counts[v] }));
      }

      if (mounted) {
        setMonthlyResponses(monthlyResponsesData);
        setTopCompanies(topCompaniesData);
        setScoreBins(scoreBinsData);
        setStackedMonthlyByCompany(stacked);
        setCategoryDist(categoryData);
        setAnswersDist(answersData);
      }
    })();
    return () => { mounted = false; };
  }, [partnerId, companyId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Respostas por mês - Barras coloridas */}
      <Card className="p-6 rounded-2xl shadow-md">
        <div className="mb-3">
          <h3 className="text-sm font-medium">Respostas por Mês</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyResponses}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.35} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="responses" name="Respostas" fill="#1DB584" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Respostas por Categoria (Empresa selecionada) - Pizza/Donut */}
      <Card className="p-6 rounded-2xl shadow-md">
        <div className="mb-3">
          <h3 className="text-sm font-medium">Respostas por Categoria</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={categoryDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {categoryDist.map((entry, index) => (
                  <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Distribuição de Respostas (Escala) - Barras verticais */}
      <Card className="p-6 rounded-2xl shadow-md">
        <div className="mb-3">
          <h3 className="text-sm font-medium">Distribuição de Respostas (Escala)</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={answersDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.35} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Respostas" fill="#8B5CF6" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Distribuição de Score (Zonas) - RadialBar colorida */}
      <Card className="p-6 rounded-2xl shadow-md">
        <div className="mb-3">
          <h3 className="text-sm font-medium">Distribuição de Score (Zonas)</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="20%" outerRadius="90%" data={scoreBins} startAngle={90} endAngle={-270}>
              <RadialBar minAngle={5} background clockWise dataKey="value">
                {scoreBins.map((entry, index) => (
                  <Cell key={`cell-r-${index}`} fill={ZONE_COLORS[index % ZONE_COLORS.length]} />
                ))}
              </RadialBar>
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              <Tooltip content={<RadialTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default DashboardChartsGrid;
//