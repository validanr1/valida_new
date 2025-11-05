import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError, showSuccess } from "@/utils/toast";

type Company = {
  id: string;
  name: string;
  partner_id: string;
  assessment_type_id?: string;
};

type AssessmentType = { id: string; name?: string };
type Item = { id: string; name: string; status: "active" | "inactive"; order?: number };

const GES = () => {
  const { session } = useSession();
  const companyId = session?.company_id;
  const [company, setCompany] = useState<Company | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [order, setOrder] = useState<string>("");

  const typeLabel = useMemo(() => {
    const n = (assessmentType?.name || "").toUpperCase();
    if (n.includes("GHE")) return "GHE";
    if (n.includes("GES")) return "GES";
    return "Tipo";
  }, [assessmentType?.name]);

  const loadData = async (cid?: string) => {
    const targetId = cid ?? companyId;
    if (!targetId) {
      setCompany(null);
      setAssessmentType(null);
      setItems([]);
      return;
    }
    const { data: comp } = await supabase
      .from("companies")
      .select("id,name,partner_id,assessment_type_id")
      .eq("id", targetId)
      .maybeSingle();
    setCompany((comp as Company) ?? null);
    if (comp?.assessment_type_id) {
      const { data: at } = await supabase
        .from("assessment_types")
        .select("id,name")
        .eq("id", comp.assessment_type_id)
        .maybeSingle();
      setAssessmentType((at as AssessmentType) ?? null);
      if (comp?.partner_id && (at as any)?.id) {
        const { data: its } = await supabase
          .from("assessment_type_items")
          .select("id,name,status,order")
          .eq("partner_id", comp.partner_id)
          .eq("assessment_type_id", (at as any).id)
          .order("order", { ascending: true });
        setItems((its as Item[]) ?? []);
      } else {
        setItems([]);
      }
    } else {
      setAssessmentType(null);
      setItems([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) loadData();
    const handler = () => loadData();
    window.addEventListener("companies_changed", handler);
    return () => {
      mounted = false;
      window.removeEventListener("companies_changed", handler);
    };
  }, [companyId]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setStatus("active");
    setOrder("");
    setOpen(true);
  };

  const openEdit = (it: Item) => {
    setEditing(it);
    setName(it.name);
    setStatus(it.status);
    setOrder(String(it.order ?? ""));
    setOpen(true);
  };

  const saveItem = async () => {
    if (!company?.partner_id || !assessmentType?.id) return;
    if (!name.trim()) {
      showError("Informe o nome.");
      return;
    }
    const payload: any = {
      id: editing?.id,
      partner_id: company.partner_id,
      assessment_type_id: assessmentType.id,
      name: name.trim(),
      status,
      order: Number(order) || null,
    };
    const { data, error } = await supabase.from("assessment_type_items").upsert(payload).select("id,name,status,order").single();
    if (error) {
      showError("Não foi possível salvar o item.");
      return;
    }
    const saved = data as Item;
    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      const next = exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
      return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "pt-BR"));
    });
    setOpen(false);
    showSuccess(editing ? "Item atualizado." : "Item criado.");
  };

  const deleteItem = async (it: Item) => {
    const { error } = await supabase.from("assessment_type_items").delete().eq("id", it.id);
    if (error) { showError("Falha ao excluir."); return; }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    showSuccess("Item excluído.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{typeLabel}</h1>
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="flex items-center justify-between p-4">
          <div className="text-sm font-medium">Itens cadastrados</div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>+ Novo Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editing ? `Editar ${typeLabel}` : `Cadastrar ${typeLabel}`}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do {typeLabel} *</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder={`Ex: ${typeLabel} 01 - Escritório Administrativo`}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ordem</label>
                    <Input 
                      type="number" 
                      inputMode="numeric" 
                      value={order} 
                      onChange={(e) => setOrder(e.target.value)} 
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={saveItem}>{editing ? "Salvar alterações" : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D]">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Ordem</TableHead>
              <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${it.status === "active" ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
                    {it.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell>{typeof it.order === "number" ? it.order : "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteItem(it)}>Excluir</Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhum item cadastrado para este tipo.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default GES;
