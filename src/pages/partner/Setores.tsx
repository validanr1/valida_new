import { useEffect, useState, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Textarea } from "@/components/ui/textarea";
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

type Dept = {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

const Setores = () => {
  const { session } = useSession();
  const companyId = session?.company_id;
  const [items, setItems] = useState<Dept[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dept | null>(null);

  useEffect(() => {
    if (!companyId) {
      setItems([]);
      return;
    }
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Setores] Falha ao carregar setores:", error);
      }
      if (mounted) setItems((data as Dept[]) ?? []);
    })();
    return () => { mounted = false; };
  }, [companyId]);

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para gerenciar setores.</div>
      </Card>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  const openEdit = (d: Dept) => {
    setEditing(d);
    setName(d.name);
    setDescription(d.description ?? "");
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome do setor.");
      return;
    }

    const payload: Partial<Dept> = {
      id: editing?.id,
      company_id: companyId,
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
    };

    const { data, error } = await supabase
      .from("departments")
      .upsert(payload as any)
      .select("*");

    if (error) {
      console.error("[Setores] Não foi possível salvar o setor:", error);
      showError("Não foi possível salvar o setor.");
      return;
    }

    const saved = (data ?? [])[0] as Dept;

    // Log audit trail
    if (session?.user?.id && (session as any)?.partnerId) {
      const auditAction = editing ? "Atualizou Setor" : "Criou Setor";
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user.id,
        partner_id: (session as any).partnerId,
        action: auditAction,
        entity: "Setor",
        payload_json: {
          department_id: saved.id,
          department_name: saved.name,
          company_id: companyId,
        },
      });

      if (auditError) {
        console.error("[Setores] Falha ao registrar log de auditoria:", auditError);
      }
    }

    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
    });
    setOpen(false);
    showSuccess(editing ? "Setor atualizado." : "Setor criado.");
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
      const payload = rows.map((r) => {
        const nm = mapValNormalized(r, ["name","nome","setor","departamento"]);
        const desc = mapValNormalized(r, ["description","descricao","descrição"]);
        return { company_id: companyId, name: nm || "", description: desc || null } as Partial<Dept>;
      }).filter((p) => (p.name as any)?.trim());
      if (payload.length === 0) { showError("Nenhuma linha válida encontrada."); return; }
      const chunk = 200;
      for (let i = 0; i < payload.length; i += chunk) {
        const slice = payload.slice(i, i + chunk);
        const { error } = await supabase.from("departments").insert(slice as any);
        if (error) { showError(`Erro ao importar: ${error.message}`); return; }
      }
      const { data } = await supabase.from("departments").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      setItems((data as Dept[]) ?? []);
      showSuccess("Importação de setores concluída.");
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
    const headers = ["name","description"];
    const rows = [
      ["Operacional","Atividades operacionais de campo"],
      ["Administrativo","Rotinas administrativas e financeiras"],
    ];
    const esc = (v: any) => String(v).replace(/"/g, '""');
    return [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  };

  const downloadTemplate = () => {
    const csv = getSampleCsv();
    downloadFile(csv, "modelo_setores.csv", "text/csv");
  };

  const openDeleteConfirm = (dept: Dept) => {
    setDeleteTarget(dept);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase.from("departments").delete().eq("id", deleteTarget.id);
    if (error) {
      console.error("[Setores] Falha ao excluir setor:", error);
      showError("Falha ao excluir setor.");
      return;
    }

    // Log audit trail
    if (session?.user?.id && (session as any)?.partnerId) {
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user.id,
        partner_id: (session as any).partnerId,
        action: "Excluiu Setor",
        entity: "Setor",
        payload_json: {
          department_id: deleteTarget.id,
          department_name: deleteTarget.name,
          company_id: companyId,
        },
      });

      if (auditError) {
        console.error("[Setores] Falha ao registrar log de auditoria para exclusão:", auditError);
      }
    }

    setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Setor excluído.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Setores</h1>
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
              Arquivos aceitos: CSV (.csv) e Excel (.xlsx, .xls). Use a primeira aba. Cabeçalhos: name|nome|setor|departamento; description|descricao|descrição.
            </TooltipContent>
          </Tooltip>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>+ Novo Setor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Setor" : "Cadastrar Setor"}</DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preencha os dados para {editing ? "editar o setor existente" : "cadastrar um novo setor"}.
                </p>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-2">
                  <label htmlFor="nome-setor" className="text-sm font-medium">Nome do Setor</label>
                  <Input
                    id="nome-setor"
                    placeholder="Ex: Recursos Humanos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="descricao-setor" className="text-sm font-medium">Descrição (opcional)</label>
                  <Textarea
                    id="descricao-setor"
                    placeholder="Descreva as responsabilidades e características do setor..."
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
                  {editing ? "Salvar alterações" : "Cadastrar Setor"}
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
              <TableHead className="text-white">Descrição</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{d.description ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteConfirm(d)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  Nenhum setor cadastrado para esta empresa.
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
            <AlertDialogTitle>Excluir setor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor{" "}
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

export default Setores;
