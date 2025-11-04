import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Assessment = {
  id: string;
  partner_id?: string;
  company_id?: string;
  employee_id?: string;
  department?: string;
  role?: string;
  status?: string;
  score?: number;
  created_at?: string;
};

type Employee = { id: string; first_name: string; last_name?: string; email?: string };

const AssessmentsList = () => {
  const { session } = useSession();
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [items, setItems] = useState<Assessment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!partnerId) {
      setItems([]);
      if (!companyId) setEmployees([]);
      return;
    }
    let mounted = true;
    (async () => {
      const promises: any[] = [];
      // employees: quando há company selecionada
      if (companyId) {
        promises.push(
          supabase.from("employees").select("id,first_name,last_name,email").eq("company_id", companyId)
        );
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }
      // assessments: todas do parceiro; filtramos no client por companyId se houver
      promises.push(
        supabase
          .from("assessments")
          .select("*")
          .eq("partner_id", partnerId)
          .order("created_at", { ascending: false })
      );

      const [{ data: emps }, { data: ass }] = await Promise.all(promises);
      if (mounted) {
        setEmployees((emps as any) ?? []);
        const all = (ass as any[]) ?? [];
        setItems(companyId ? all.filter(a => a.company_id === companyId) : all);
      }
    })();
    return () => { mounted = false; };
  }, [partnerId, companyId, supabase]);

  const employeesById = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => (map[e.id] = e));
    return map;
  }, [employees]);

  const empName = (e?: Employee) => [e?.first_name, e?.last_name].filter(Boolean).join(" ");

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para visualizar as avaliações.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Avaliações</h1>
        <Link to={`/partner/reports/overview`}>
          <Button>Ver Relatório Geral</Button>
        </Link>
      </div>
      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Data</TableHead>
              <TableHead className="text-white">Funcionário</TableHead>
              <TableHead className="text-white">Setor</TableHead>
              <TableHead className="text-white">Cargo</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Score</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => {
              const e = a.employee_id ? employeesById[a.employee_id] : undefined;
              const statusPt = (() => {
                switch ((a.status || '').toLowerCase()) {
                  case 'completed': return 'Concluída';
                  case 'in_progress': return 'Em andamento';
                  case 'pending': return 'Pendente';
                  case 'cancelled': return 'Cancelada';
                  default: return a.status || '—';
                }
              })();
              return (
                <TableRow key={a.id}>
                  <TableCell>{fmtDate(a.created_at)}</TableCell>
                  <TableCell>{empName(e) || e?.email || "—"}</TableCell>
                  <TableCell>{a.department ?? "—"}</TableCell>
                  <TableCell>{a.role ?? "—"}</TableCell>
                  <TableCell>{statusPt}</TableCell>
                  <TableCell>{typeof a.score === "number" ? a.score : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/partner/reports/individual/${a.id}`}>
                      <Button variant="outline" size="sm">Ver Detalhes</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada para esta empresa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AssessmentsList;
