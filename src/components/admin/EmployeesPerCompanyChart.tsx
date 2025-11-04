import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Company = { id: string; name: string };
type Employee = { id: string; company_id: string };

const EmployeesPerCompanyChart = () => {
  const [data, setData] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: companies }, { data: employees }] = await Promise.all([
        supabase.from("companies").select("id,name"),
        supabase.from("employees").select("id,company_id"),
      ]);
      if (!mounted) return;

      const comps = (companies ?? []) as Company[];
      const emps = (employees ?? []) as Employee[];

      const byCompany: Record<string, number> = {};
      emps.forEach((e) => {
        byCompany[e.company_id] = (byCompany[e.company_id] ?? 0) + 1;
      });
      const rows = comps.map((c) => ({
        name: c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name,
        count: byCompany[c.id] ?? 0,
      }));
      setData(rows);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Colaboradores por empresa</h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="hsl(var(--muted))" strokeOpacity={0.35} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
            <Bar dataKey="count" fill="#1DB584" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EmployeesPerCompanyChart;