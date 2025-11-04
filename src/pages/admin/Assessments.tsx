import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";

type Partner = { id: string; name: string };
type Company = { id: string; name: string; partner_id: string };
type Employee = { id: string; company_id: string; first_name: string; last_name?: string; email?: string };
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

const Assessments = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  // filtros
  const [partnerId, setPartnerId] = useState<string | undefined>(undefined);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: ass }, { data: parts }, { data: comps }, { data: emps }] = await Promise.all([
        supabase.from("assessments").select("*").order("created_at", { ascending: false }),
        supabase.from("partners").select("id,name").order("name", { ascending: true }),
        supabase.from("companies").select("id,name,partner_id").order("name", { ascending: true }),
        supabase.from("employees").select("*").order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setAssessments((ass as Assessment[]) ?? []);
      setPartners((parts as Partner[]) ?? []);
      setCompanies((comps as Company[]) ?? []);
      setEmployees((emps as Employee[]) ?? []);
    })();
    return () => { mounted = false; };
  }, []);

  const confirmDelete = async () => {
    if (!assessmentToDelete) return;

    const { error } = await supabase.from("assessments").delete().eq("id", assessmentToDelete);

    if (error) {
      console.error("Error deleting assessment:", error);
      showError("Falha ao deletar a avaliação.");
    } else {
      setAssessments(assessments.filter((a) => a.id !== assessmentToDelete));
      showSuccess("Avaliação deletada com sucesso.");
    }
    setAssessmentToDelete(null);
  };

  const companiesByPartner = useMemo(() => {
    const map: Record<string, Company[]> = {};
    companies.forEach((c) => {
      (map[c.partner_id] = map[c.partner_id] || []).push(c);
    });
    return map;
  }, [companies]);

  const employeesByCompany = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    employees.forEach((e) => {
      (map[e.company_id] = map[e.company_id] || []).push(e);
    });
    return map;
  }, [employees]);

  const partnerOptions = partners;
  const companyOptions = useMemo(() => {
    if (!partnerId) return companies;
    return companiesByPartner[partnerId] ?? [];
  }, [companies, companiesByPartner, partnerId]);

  const employeeOptions = useMemo(() => {
    if (!companyId) return employees;
    return employeesByCompany[companyId] ?? [];
  }, [employees, employeesByCompany, companyId]);

  const deptOptions = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => a.department && set.add(a.department));
    return Array.from(set);
  }, [assessments]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => a.role && set.add(a.role));
    return Array.from(set);
  }, [assessments]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => a.status && set.add(a.status));
    return Array.from(set);
  }, [assessments]);

  const statusToPt = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'completed': return 'Concluída';
      case 'in_progress': return 'Em andamento';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      default: return s || '—';
    }
  };

  const partnersById = useMemo(() => {
    const map: Record<string, Partner> = {};
    partners.forEach((p) => (map[p.id] = p));
    return map;
  }, [partners]);

  const companiesById = useMemo(() => {
    const map: Record<string, Company> = {};
    companies.forEach((c) => (map[c.id] = c));
    return map;
  }, [companies]);

  const employeesById = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => (map[e.id] = e));
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (partnerId && a.partner_id !== partnerId) return false;
      if (companyId && a.company_id !== companyId) return false;
      if (employeeId && a.employee_id !== employeeId) return false;
      if (department && a.department !== department) return false;
      if (role && a.role !== role) return false;
      if (status && a.status !== status) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const emp = a.employee_id ? employeesById[a.employee_id] : undefined;
        const company = a.company_id ? companiesById[a.company_id] : undefined;
        const partner = a.partner_id ? partnersById[a.partner_id] : undefined;
        const bucket = [
          a.id,
          a.department,
          a.role,
          a.status,
          emp?.first_name,
          emp?.last_name,
          emp?.email,
          company?.name,
          partner?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return bucket.includes(q);
      }
      return true;
    });
  }, [assessments, partnerId, companyId, employeeId, department, role, status, query, employeesById, companiesById, partnersById]);

  const resetFilters = () => {
    setPartnerId(undefined);
    setCompanyId(undefined);
    setEmployeeId(undefined);
    setDepartment(undefined);
    setRole(undefined);
    setStatus(undefined);
    setQuery("");
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const empName = (e?: Employee) => [e?.first_name, e?.last_name].filter(Boolean).join(" ");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Avaliações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visualize todas as avaliações recebidas de todos os parceiros.</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? "Esconder Filtros" : "Mostrar Filtros"}
        </Button>
      </div>

      {/* Filtros (controlados pelo botão) */}
      <Card className={`p-4 ${showFilters ? "" : "hidden"}`}>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-sm font-medium mb-1">Parceiro</div>
            <Select value={partnerId} onValueChange={(v) => { setPartnerId(v); setCompanyId(undefined); setEmployeeId(undefined); }}>
              <SelectTrigger><SelectValue placeholder="Todos os parceiros" /></SelectTrigger>
              <SelectContent>
                {partnerOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Empresa</div>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setEmployeeId(undefined); }}>
              <SelectTrigger><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
              <SelectContent>
                {companyOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Funcionário</div>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Todos os funcionários" /></SelectTrigger>
              <SelectContent>
                {employeeOptions.map((e) => <SelectItem key={e.id} value={e.id}>{empName(e) || e.email || e.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Setor</div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Todos os setores" /></SelectTrigger>
              <SelectContent>
                {deptOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Cargo</div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Todos os cargos" /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Status</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => <SelectItem key={s} value={s}>{statusToPt(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input placeholder="Buscar por nome, e-mail, setor, cargo..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={resetFilters} className="rounded-md border px-3 text-sm hover:bg-muted">Limpar filtros</button>
        </div>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Data</TableHead>
              <TableHead className="text-white">Parceiro</TableHead>
              <TableHead className="text-white">Empresa</TableHead>
              <TableHead className="text-white">Funcionário</TableHead>
              <TableHead className="text-white">Setor</TableHead>
              <TableHead className="text-white">Cargo</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Score</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const p = a.partner_id ? partnersById[a.partner_id] : undefined;
              const c = a.company_id ? companiesById[a.company_id] : undefined;
              const e = a.employee_id ? employeesById[a.employee_id] : undefined;
              return (
                <TableRow key={a.id}>
                  <TableCell>{fmtDate(a.created_at)}</TableCell>
                  <TableCell>{p?.name ?? "—"}</TableCell>
                  <TableCell>{c?.name ?? "—"}</TableCell>
                  <TableCell>{empName(e) || e?.email || "—"}</TableCell>
                  <TableCell>{a.department ?? "—"}</TableCell>
                  <TableCell>{a.role ?? "—"}</TableCell>
                  <TableCell>{statusToPt(a.status)}</TableCell>
                  <TableCell>{typeof a.score === "number" ? a.score : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" onClick={() => setAssessmentToDelete(a.id)}>
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  Nenhuma avaliação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!assessmentToDelete} onOpenChange={(open) => !open && setAssessmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a avaliação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Assessments;