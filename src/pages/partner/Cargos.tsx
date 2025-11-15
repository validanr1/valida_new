import { useEffect, useMemo, useState, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Check } from "lucide-react";
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

type Role = { 
  id: string; 
  company_id: string; 
  name: string; 
  department_id?: string | null;
  level_id?: string | null;
  description?: string | null;
  status?: "active" | "inactive"; 
  created_at?: string 
};

type Department = { id: string; name: string };
type Level = { id: string; name: string; status: "active" | "inactive" };

const Cargos = () => {
  const { session } = useSession();
  const companyId = session?.company_id;
  const [items, setItems] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  
  // Estados do formulário
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [levelId, setLevelId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");

  // Estado para o modal de confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!companyId) {
      setItems([]);
      setDepartments([]);
      setLevels([]);
      return;
    }
    let mounted = true;
    (async () => {
      const [{ data: rolesData }, { data: departmentsData }, { data: levelsData }] = await Promise.all([
        supabase.from("roles").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("departments").select("id,name").eq("company_id", companyId).order("name", { ascending: true }),
        supabase.from("levels").select("id,name,status").order("name", { ascending: true }),
      ]);
      if (mounted) {
        setItems((rolesData as Role[]) ?? []);
        setDepartments((departmentsData as Department[]) ?? []);
        setLevels((levelsData as Level[]) ?? []);
      }
    })();
    return () => { mounted = false; };
  }, [companyId]);

  // Mapeamento para exibir nomes de setor e nível na tabela
  const departmentsById = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach(d => map[d.id] = d.name);
    return map;
  }, [departments]);

  const levelsById = useMemo(() => {
    const map: Record<string, string> = {};
    levels.forEach(l => map[l.id] = l.name);
    return map;
  }, [levels]);

  // Filtrar apenas níveis ativos para o select
  const activeLevels = useMemo(() => {
    return levels.filter(level => level.status === "active");
  }, [levels]);

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para gerenciar cargos.</div>
      </Card>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDepartmentId(undefined);
    setLevelId(undefined);
    setDescription("");
    setOpen(true);
  };

  const normalizeHeader = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, "_");
  const mapValNormalized = (obj: any, keys: string[]) => {
    const normalized: Record<string, any> = {};
    Object.keys(obj || {}).forEach((k) => { normalized[normalizeHeader(k)] = (obj as any)[k]; });
    for (const k of keys) {
      const nk = normalizeHeader(k);
      const v = normalized[nk];
      if (v !== undefined && String(v).trim() !== "") return String(v);
    }
    return "";
  };
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [] as any[];
    const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => normalizeHeader(h));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep);
      const obj: any = {};
      headers.forEach((h, idx) => (obj[h] = (parts[idx] ?? "").trim()));
      rows.push(obj);
    }
    return rows;
  };

  const onClickImport = () => fileInputRef.current?.click();
  const ensureXlsxLoaded = () => new Promise<void>((resolve, reject) => {
    const w: any = window as any;
    if (w.XLSX) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar parser XLSX"));
    document.head.appendChild(s);
  });
  const readExcelRows = async (file: File) => {
    await ensureXlsxLoaded();
    const buf = await file.arrayBuffer();
    const w: any = window as any;
    const wb = w.XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = w.XLSX.utils.sheet_to_json(ws, { defval: "" });
    return json as any[];
  };
  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setIsImporting(true);
    try {
      const ext = file.name.toLowerCase();
      const rows = ext.endsWith(".xlsx") || ext.endsWith(".xls") ? await readExcelRows(file) : parseCsv(await file.text());
      if (rows.length === 0) { showError("CSV vazio ou inválido."); return; }
      const byDeptName: Record<string, string> = {};
      departments.forEach((d) => (byDeptName[d.name.toLowerCase()] = d.id));
      const byLevelName: Record<string, string> = {};
      levels.forEach((l) => (byLevelName[l.name.toLowerCase()] = l.id));

      const toInsert: any[] = [];
      for (const r of rows) {
        const nm = mapValNormalized(r, ["name","nome","cargo","função","funcao"]);
        const deptRaw = mapValNormalized(r, ["department","departamento","setor"]);
        const deptNameLower = deptRaw.toLowerCase();
        const levelNameLower = mapValNormalized(r, ["level","nivel","nível"]).toLowerCase();
        const desc = mapValNormalized(r, ["description","descricao","descrição"]);
        const statusRaw = mapValNormalized(r, ["status"]).toLowerCase();
        if (!nm.trim()) continue;
        let department_id = byDeptName[deptNameLower];
        if (!department_id && deptNameLower) {
          const { data: created } = await supabase
            .from("departments")
            .insert({ company_id: companyId, name: deptRaw })
            .select("id")
            .single();
          department_id = (created as any)?.id;
          if (department_id) byDeptName[deptNameLower] = department_id;
        }
        const level_id = byLevelName[levelNameLower] || null;
        const status: "active" | "inactive" = statusRaw === "inactive" || statusRaw === "inativo" ? "inactive" : "active";
        toInsert.push({ company_id: companyId, name: nm, department_id: department_id || null, level_id, description: desc || null, status });
      }
      if (toInsert.length === 0) { showError("Nenhuma linha válida encontrada."); return; }
      const chunk = 200;
      for (let i = 0; i < toInsert.length; i += chunk) {
        const slice = toInsert.slice(i, i + chunk);
        const { error } = await supabase.from("roles").insert(slice as any);
        if (error) { showError(`Erro ao importar: ${error.message}`); return; }
      }
      const { data: rolesData } = await supabase.from("roles").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      setItems((rolesData as Role[]) ?? []);
      showSuccess("Importação de cargos concluída.");
    } catch (err: any) {
      showError("Falha ao processar o CSV.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getSampleCsv = () => {
    const headers = ["name","department","level","description","status"];
    const rows = [
      ["Auxiliar","Operacional","Junior","Apoio às atividades operacionais","active"],
      ["Assistente","Administrativo","Pleno","Rotinas administrativas","inactive"],
    ];
    const esc = (v: any) => String(v).replace(/"/g, '""');
    return [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  };

  const downloadTemplate = () => {
    const csv = getSampleCsv();
    downloadFile(csv, "modelo_cargos.csv", "text/csv");
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDepartmentId(r.department_id ?? undefined);
    setLevelId(r.level_id ?? undefined);
    setDescription(r.description ?? "");
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome do cargo.");
      return;
    }
    const { data, error } = await supabase
      .from("roles")
      .upsert({
        id: editing?.id,
        company_id: companyId,
        name: name.trim(),
        department_id: departmentId || null,
        level_id: levelId || null,
        description: description.trim() || null,
        status: "active",
      } as any)
      .select("*");
    if (error) {
      showError("Não foi possível salvar o cargo.");
      return;
    }
    const saved = data?.[0] as Role;

    // Log audit trail
    if (session?.user?.id && (session as any)?.partnerId) {
      const auditAction = editing ? "Atualizou Cargo" : "Criou Cargo";
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user.id,
        partner_id: (session as any).partnerId,
        action: auditAction,
        entity: "Cargo",
        payload_json: { role_id: saved.id, role_name: saved.name, company_id: companyId },
      });
      if (auditError) {
        console.error("[Cargos] Falha ao registrar log de auditoria:", auditError);
      }
    }

    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
    });
    setOpen(false);
    showSuccess(editing ? "Cargo atualizado." : "Cargo criado.");
  };

  const openDeleteConfirm = (role: Role) => {
    setDeleteTarget(role);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("roles").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir cargo.");
      return;
    }

    // Log audit trail
    if (session?.user?.id && (session as any)?.partnerId) {
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user.id,
        partner_id: (session as any).partnerId,
        action: "Excluiu Cargo",
        entity: "Cargo",
        payload_json: { role_id: deleteTarget.id, role_name: deleteTarget.name, company_id: companyId },
      });
      if (auditError) {
        console.error("[Cargos] Falha ao registrar log de auditoria para exclusão:", auditError);
      }
    }

    setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Cargo excluído.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cargos</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={onFileSelected} className="hidden" />
          <Button variant="outline" onClick={downloadTemplate}>Baixar modelo CSV</Button>
          <Button variant="outline" onClick={onClickImport} disabled={isImporting}>{isImporting ? "Importando..." : "Importar CSV"}</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full border hover:bg-zinc-50">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              Arquivos aceitos: CSV (.csv) e Excel (.xlsx, .xls). Use a primeira aba. Cabeçalhos: name|nome|cargo|função|funcao; department|departamento|setor; level|nivel|nível; description|descricao|descrição; status.
            </TooltipContent>
          </Tooltip>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>+ Novo Cargo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Cargo" : "Cadastrar Cargo"}</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preencha os dados para {editing ? "editar o cargo existente" : "cadastrar um novo cargo"}.
                </p>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-2">
                  <label htmlFor="nome-cargo" className="text-sm font-medium">Nome do Cargo</label>
                  <Input 
                    id="nome-cargo"
                    placeholder="Ex: Recepcionista" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="h-10 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setor-cargo" className="text-sm font-medium">Setor</label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="setor-cargo" className="h-10 rounded-xl">
                      <SelectValue placeholder="Selecione um setor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <SelectItem value="no-departments" disabled>Nenhum setor disponível</SelectItem>
                      ) : (
                        departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="nivel-cargo" className="text-sm font-medium">Nível</label>
                  <Select value={levelId} onValueChange={setLevelId}>
                    <SelectTrigger id="nivel-cargo" className="h-10 rounded-xl">
                      <SelectValue placeholder="Selecione o nível..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLevels.length === 0 ? (
                        <SelectItem value="no-levels" disabled>Nenhum nível ativo disponível</SelectItem>
                      ) : (
                        activeLevels.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="descricao-cargo" className="text-sm font-medium">Descrição</label>
                  <Textarea 
                    id="descricao-cargo"
                    placeholder="Descreva as responsabilidades do cargo..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={3}
                    className="rounded-xl" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={onSave} className="bg-[#1DB584] hover:bg-[#159a78]">
                  <Check className="mr-2 h-4 w-4" />
                  {editing ? "Salvar alterações" : "Cadastrar Cargo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">Setor</TableHead>
              <TableHead className="text-white">Nível</TableHead>
              <TableHead className="text-white">Descrição</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.department_id ? departmentsById[r.department_id] : "—"}</TableCell>
                <TableCell>{r.level_id ? levelsById[r.level_id] : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{r.description ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteConfirm(r)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum cargo cadastrado para esta empresa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cargo{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "selecionado"}</span>?
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cargos;
