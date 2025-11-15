"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { format } from "date-fns";

type Point = { name: string; value: number };

const MiniTrends = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [responsesTrend, setResponsesTrend] = useState<Point[]>([]);
  const [scoreTrend, setScoreTrend] = useState<Point[]>([]);
  const [companiesTrend, setCompaniesTrend] = useState<Point[]>([]);

  useEffect(() => {
    if (!partnerId) { setResponsesTrend([]); setScoreTrend([]); setCompaniesTrend([]); return; }
    let mounted = true;
    (async () => {
      // Assessments for last 6 months
      let aQuery = supabase
        .from("assessments")
        .select("id,company_id,score,created_at")
        .eq("partner_id", partnerId);
      if (companyId) aQuery = aQuery.eq("company_id", companyId);
      const { data: assessments } = await aQuery;
      const ids = (assessments ?? []).map((a: any) => a.id);
      const { data: respRows } = ids.length > 0 ? await supabase.from("assessment_responses").select("assessment_id").in("assessment_id", ids) : { data: [] };

      const respCount: Record<string, number> = {};
      (respRows ?? []).forEach((r: any) => { respCount[r.assessment_id] = (respCount[r.assessment_id] || 0) + 1; });

      const buckets: Record<string, { resp: number; scoreSum: number; scoreCount: number }> = {};
      (assessments ?? []).forEach((a: any) => {
        const d = new Date(a.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!buckets[key]) buckets[key] = { resp: 0, scoreSum: 0, scoreCount: 0 };
        buckets[key].resp += respCount[a.id] || 0;
        if (typeof a.score === 'number') { buckets[key].scoreSum += a.score; buckets[key].scoreCount += 1; }
      });
      const sorted = Object.keys(buckets).sort().slice(-6);
      const respTrend = sorted.map(k => ({ name: format(new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 1), 'LLL'), value: buckets[k].resp }));
      const scoreTrend = sorted.map(k => ({ name: format(new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 1), 'LLL'), value: buckets[k].scoreCount ? Number((buckets[k].scoreSum / buckets[k].scoreCount).toFixed(1)) : 0 }));

      const { data: companies } = await supabase
        .from("companies")
        .select("id,created_at")
        .eq("partner_id", partnerId);
      const cbuckets: Record<string, number> = {};
      (companies ?? []).forEach((c: any) => {
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        cbuckets[key] = (cbuckets[key] || 0) + 1;
      });
      const csorted = Object.keys(cbuckets).sort().slice(-6);
      const companiesTrend = csorted.map(k => ({ name: format(new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 1), 'LLL'), value: cbuckets[k] }));

      if (mounted) { setResponsesTrend(respTrend); setScoreTrend(scoreTrend); setCompaniesTrend(companiesTrend); }
    })();
    return () => { mounted = false; };
  }, [partnerId, companyId]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4 rounded-2xl">
        <div className="mb-2 text-xs text-muted-foreground">Evolução de Respostas</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={responsesTrend}>
              <Area type="monotone" dataKey="value" stroke="#1DB584" fill="#1DB58422" strokeWidth={2} />
              <Tooltip cursor={{ strokeOpacity: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 rounded-2xl">
        <div className="mb-2 text-xs text-muted-foreground">Score Médio (Mensal)</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrend}>
              <Line type="monotone" dataKey="value" stroke="#0E3A4D" strokeWidth={2} dot={false} />
              <Tooltip cursor={{ strokeOpacity: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4 rounded-2xl">
        <div className="mb-2 text-xs text-muted-foreground">Empresas Avaliadas (Últimos 6 meses)</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={companiesTrend}>
              <Area type="monotone" dataKey="value" stroke="#2563EB" fill="#2563EB22" strokeWidth={2} />
              <Tooltip cursor={{ strokeOpacity: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default MiniTrends;