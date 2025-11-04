import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { showError, showSuccess } from "@/utils/toast";

type Partner = { id: string; name: string };
type Company = { id: string; name: string; partner_id: string };
type Employee = { id: string; company_id: string; first_name: string; last_name?: string; email?: string };
type Report = {
  id: string;
  partner_id?: string;
  company_id?: string;
  employee_id?: string;
  department?: string;
  role?: string;
  title?: string;
  description?: string;
  status?: string;
  treated?: boolean;
  created_at?: string;
};

const Denuncias = () => {
  const { session } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // filtros
  const [partnerId, setPartnerId] = useState<string | undefined>(undefined);
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
  const [treated, setTreated] = useState<string | undefined>(undefined); // "sim" | "nao"
  const [query, setQuery] = useState("");
  const [filtersKey, setFiltersKey] = useState(0); // Força re-montagem dos filtros

  // Modal de detalhes/edição
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<string | undefined>(undefined);
  const [editTreated, setEditTreated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // denuncias
      const { data: reps, error: repsErr } = await supabase
        .from("denuncias")
        .select(
          "id, partner_id, company_id, employee_id, department:setor, role:cargo, title:titulo, description:descricao, status, treated:tratada, created_at, attachments:anexos"
        )
        .order("created_at", { ascending: false });
      if (repsErr) {
        console.error("[Admin/Denuncias] Falha ao carregar denúncias:", repsErr);
        showError("Falha ao carregar denúncias (verifique permissões RLS).");
      }

      // partners
      const { data: parts, error: partsErr } = await supabase
        .from("partners")
        .select("id,name")
        .order("name", { ascending: true });
      if (partsErr) console.error("[Admin/Denuncias] Falha ao carregar parceiros:", partsErr);

      // companies
      const { data: comps, error: compsErr } = await supabase
        .from("companies")
        .select("id,name,partner_id")
        .order("name", { ascending: true });
      if (compsErr) console.error("[Admin/Denuncias] Falha ao carregar empresas:", compsErr);

      // employees
      const { data: emps, error: empsErr } = await supabase
        .from("employees")
        .select("id,first_name,last_name,email");
      if (empsErr) console.error("[Admin/Denuncias] Falha ao carregar funcionários:", empsErr);

      if (!mounted) return;
      setReports((reps as Report[]) ?? []);
      setPartners((parts as Partner[]) ?? []);
      setCompanies((comps as Company[]) ?? []);
      setEmployees((emps as Employee[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
    reports.forEach((r) => r.department && set.add(r.department));
    return Array.from(set);
  }, [reports]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => r.role && set.add(r.role));
    return Array.from(set);
  }, [reports]);

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
    // Sem filtros e sem busca -> retorna tudo
    const noFilters = !partnerId && !companyId && !employeeId && !department && !role && !treated && !query.trim();
    if (noFilters) return reports;

    return reports.filter((r) => {
      if (partnerId && r.partner_id !== partnerId) return false;
      if (companyId && r.company_id !== companyId) return false;
      if (employeeId && r.employee_id !== employeeId) return false;
      if (department && r.department !== department) return false;
      if (role && r.role !== role) return false;

      if (treated) {
        const t = r.treated ?? (r.status ? r.status === "resolved" : false);
        if (treated === "sim" && !t) return false;
        if (treated === "nao" && t) return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const emp = r.employee_id ? employeesById[r.employee_id] : undefined;
        const company = r.company_id ? companiesById[r.company_id] : undefined;
        const partner = r.partner_id ? partnersById[r.partner_id] : undefined;
        const bucket = [
          r.id,
          r.title,
          r.description,
          r.department,
          r.role,
          r.status,
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
  }, [reports, partnerId, companyId, employeeId, department, role, treated, query, employeesById, companiesById, partnersById]);

  const resetFilters = () => {
    setPartnerId(undefined);
    setCompanyId(undefined);
    setEmployeeId(undefined);
    setDepartment(undefined);
    setRole(undefined);
    setTreated(undefined);
    setQuery("");
    setFiltersKey((k) => k + 1);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const fmtStatus = (s?: string) => {
    if (!s) return "—";
    const map: Record<string, string> = {
      open: "Aberta",
      in_progress: "Em andamento",
      resolved: "Resolvida",
      rejected: "Rejeitada",
    };
    return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
  };

  const storagePublicUrl = (path: string) => {
    try {
      const { data } = supabase.storage.from("denuncias").getPublicUrl(path);
      return data.publicUrl || "";
    } catch {
      return "";
    }
  };

  const empName = (e?: Employee) => [e?.first_name, e?.last_name].filter(Boolean).join(" ");
  const treatedBadge = (r: Report) => {
    const t = r.treated ?? (r.status ? r.status === "resolved" : false);
    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${t ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
        {t ? "Tratada" : "Pendente"}
      </span>
    );
  };

  const openDetails = (report: Report) => {
    setEditingReport(report);
    setEditTitle(report.title ?? "");
    setEditDescription(report.description ?? "");
    setEditStatus(report.status ?? "open");
    setEditTreated(report.treated ?? (report.status === "resolved"));
    setDetailsOpen(true);
  };

  const saveReportDetails = async () => {
    if (!editingReport) return;
    setIsSaving(true);

    const newStatus = editTreated ? "resolved" : "open";

    const payload = {
      titulo: editTitle.trim() || null,
      descricao: editDescription.trim() || null,
      status: newStatus,
      tratada: editTreated,
      updated_at: new Date().toISOString(),
    } as any;

    const { data, error } = await supabase
      .from("denuncias")
      .update(payload)
      .eq("id", editingReport.id)
      .select(
        "id, partner_id, company_id, employee_id, department:setor, role:cargo, title:titulo, description:descricao, status, treated:tratada, created_at, attachments:anexos"
      )
      .single();

    if (error) {
      console.error("Failed to save report details:", error);
      showError("Falha ao salvar detalhes da denúncia.");
      setIsSaving(false);
      return;
    }

    const updatedReport = data as Report;
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)));
    setDetailsOpen(false);
    showSuccess("Denúncia atualizada.");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Denúncias</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe as denúncias recebidas e seus status de tratamento.</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? "Esconder filtros" : "Mostrar filtros"}
        </Button>
      </div>

      {/* Filtros (controlados pelo botão) */}
      <Card key={filtersKey} className={`p-4 ${showFilters ? "" : "hidden"}`}>
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
            <div className="text-sm font-medium mb-1">Tratada</div>
            <Select value={treated} onValueChange={setTreated}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input placeholder="Buscar por título, descrição, nome, e-mail, setor, cargo..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
              <TableHead className="text-white">Título</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Tratada</TableHead>
              <TableHead className="text-white">Anexos</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const p = r.partner_id ? partnersById[r.partner_id] : undefined;
              const c = r.company_id ? companiesById[r.company_id] : undefined;
              const e = r.employee_id ? employeesById[r.employee_id] : undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell>{p?.name ?? "—"}</TableCell>
                  <TableCell>{c?.name ?? "—"}</TableCell>
                  <TableCell>{r.title ?? "—"}</TableCell>
                  <TableCell>{fmtStatus(r.status)}</TableCell>
                  <TableCell>{treatedBadge(r)}</TableCell>
                  <TableCell>
                    {Array.isArray((r as any).attachments) && (r as any).attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {((r as any).attachments as string[]).slice(0, 3).map((p, idx) => (
                          <a
                            key={idx}
                            href={storagePublicUrl(p)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {p.split("/").pop()}
                          </a>
                        ))}
                        {((r as any).attachments as string[]).length > 3 && (
                          <span className="text-xs text-muted-foreground">+{((r as any).attachments as string[]).length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetails(r)}>
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Nenhuma denúncia encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalhes/Edição da Denúncia */}
      <Dialog open={detailsOpen} onOpenChange={(v) => { setDetailsOpen(v); if (!v) setEditingReport(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Denúncia</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID da Denúncia</label>
                <Input value={editingReport.id} disabled className="h-10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parceiro</label>
                  <Input value={partnersById[editingReport.partner_id!]?.name ?? "—"} disabled className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Empresa</label>
                  <Input value={companiesById[editingReport.company_id!]?.name ?? "—"} disabled className="h-10" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Funcionário</label>
                  <Input value={empName(employeesById[editingReport.employee_id!]) || employeesById[editingReport.employee_id!]?.email || "—"} disabled className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input value={fmtDate(editingReport.created_at)} disabled className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-sm font-medium">Título</label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-10 focus-brand-glow"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Descrição</div>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Anexos</div>
                {Array.isArray((editingReport as any).attachments) && (editingReport as any).attachments.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(editingReport as any).attachments.map((p: string, idx: number) => (
                      <li key={idx}>
                        <a className="text-blue-600 underline" href={storagePublicUrl(p)} target="_blank" rel="noreferrer">
                          {p.split("/").pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum anexo</div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-10 focus-brand-glow">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Em Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="resolved">Resolvida</SelectItem>
                      <SelectItem value="rejected">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 mt-2">
                  <div>
                    <div className="text-sm font-medium">Denúncia Tratada</div>
                    <div className="text-xs text-muted-foreground">Marque se a denúncia foi resolvida.</div>
                  </div>
                  <Switch
                    checked={editTreated}
                    onCheckedChange={setEditTreated}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveReportDetails} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Denuncias;
