import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showError, showSuccess } from "@/utils/toast";

// DB types
type ActionPlanCategory = { id: string; name: string };
interface ActionPlanRow {
  id: string;
  category_id: string | null;
  title?: string | null;
  description: string;
  is_global: boolean;
  partner_id: string | null;
  show_in_report: boolean | null;
  score_min?: number | null;
  score_max?: number | null;
}

const ActionPlans: React.FC = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partner_id ?? (session as any)?.partnerId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ActionPlanCategory[]>([]);
  const [rows, setRows] = useState<ActionPlanRow[]>([]);

  // Create/Edit modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActionPlanRow | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formScoreMin, setFormScoreMin] = useState<string>("0");
  const [formScoreMax, setFormScoreMax] = useState<string>("74.99");
  const [formShow, setFormShow] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  const canSave = useMemo(() => Boolean(partnerId), [partnerId]);

  const loadAll = async () => {
    if (!partnerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [catsRes, plansRes] = await Promise.all([
        supabase
          .from("question_categories")
          .select("id,name,status,order")
          .order("order", { ascending: true }),
        supabase
          .from("action_plans")
          .select("*")
          .eq("is_global", false)
          .eq("partner_id", partnerId),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (plansRes.error) throw plansRes.error;
      const cats = (catsRes.data as ActionPlanCategory[]) || [];
      setCategories(cats);
      setRows(((plansRes.data as ActionPlanRow[]) || []).sort((a,b)=> (a.title||"").localeCompare(b.title||"")));
    } catch (e: any) {
      console.error("[ActionPlans] loadAll error:", e);
      showError(e?.message || "Falha ao carregar Planos de Ação.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [partnerId]);

  // Ensure categories are present when opening the modal
  useEffect(() => {
    if (open && categories.length === 0 && !loading) {
      loadAll();
    }
  }, [open]);

  const resetForm = () => {
    setEditing(null);
    setFormTitle("");
    setFormCategoryId("");
    setFormScoreMin("0");
    setFormScoreMax("74.99");
    setFormShow(true);
    setFormDescription("");
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = (row: ActionPlanRow) => {
    setEditing(row);
    setFormTitle(row.title || "");
    setFormCategoryId(row.category_id || "");
    setFormScoreMin(typeof row.score_min === 'number' ? String(row.score_min) : "");
    setFormScoreMax(typeof row.score_max === 'number' ? String(row.score_max) : "");
    setFormShow(!!row.show_in_report);
    setFormDescription(row.description || "");
    setOpen(true);
  };

  const onCreate = async () => {
    if (!canSave) return;
    const title = formTitle.trim();
    const categoryId = formCategoryId;
    const description = formDescription.trim();
    const show = !!formShow;
    const scoreMin = formScoreMin ? Number(formScoreMin) : null;
    const scoreMax = formScoreMax ? Number(formScoreMax) : null;
    if (!title) { showError("Informe o nome do plano."); return; }
    if (!categoryId) { showError("Selecione a categoria."); return; }
    if (!description) { showError("Informe o conteúdo do plano."); return; }
    setSaving(true);
    try {
      const payload = {
        category_id: categoryId,
        title,
        description,
        is_global: false,
        partner_id: partnerId,
        show_in_report: show,
        score_min: scoreMin,
        score_max: scoreMax,
      } as Partial<ActionPlanRow>;
      const { error, data } = await (supabase as any)
        .from("action_plans")
        .insert(payload)
        .select("id,category_id,title,description,is_global,partner_id,show_in_report,score_min,score_max");
      if (error) throw error;
      const row = ((data as ActionPlanRow[]) || [])[0];
      setRows((prev)=> row ? [row, ...prev] : prev);
      setOpen(false);
      resetForm();
      showSuccess("Plano criado.");
    } catch (e: any) {
      console.error("[ActionPlans] create error:", e);
      showError(e?.message || "Falha ao criar plano.");
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async () => {
    if (!canSave || !editing) return;
    const title = formTitle.trim();
    const categoryId = formCategoryId;
    const description = formDescription.trim();
    const show = !!formShow;
    const scoreMin = formScoreMin ? Number(formScoreMin) : null;
    const scoreMax = formScoreMax ? Number(formScoreMax) : null;
    if (!title) { showError("Informe o nome do plano."); return; }
    if (!categoryId) { showError("Selecione a categoria."); return; }
    if (!description) { showError("Informe o conteúdo do plano."); return; }
    setSaving(true);
    try {
      const payload = {
        category_id: categoryId,
        title,
        description,
        show_in_report: show,
        score_min: scoreMin,
        score_max: scoreMax,
      } as Partial<ActionPlanRow>;
      const { error, data } = await (supabase as any)
        .from("action_plans")
        .update(payload)
        .eq("id", editing.id)
        .eq("partner_id", partnerId)
        .select("id,category_id,title,description,is_global,partner_id,show_in_report,score_min,score_max");
      if (error) throw error;
      const row = ((data as ActionPlanRow[]) || [])[0];
      if (row && row.id) {
        setRows((prev)=> prev.map(x => x.id === row.id ? row : x));
      } else {
        // Fallback if no row returned due to RLS/select filters
        await loadAll();
      }
      setOpen(false);
      resetForm();
      showSuccess("Plano atualizado.");
    } catch (e: any) {
      console.error("[ActionPlans] update error:", e);
      showError(e?.message || "Falha ao atualizar plano.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: ActionPlanRow) => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("action_plans").delete().eq("id", row.id).eq("partner_id", partnerId);
      if (error) throw error;
      setRows((prev)=> prev.filter((x)=> x.id !== row.id));
      showSuccess("Plano excluído.");
    } catch (e: any) {
      console.error("[ActionPlans] delete error:", e);
      showError(e?.message || "Falha ao excluir plano.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleShow = async (row: ActionPlanRow, next: boolean) => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("action_plans")
        .update({ show_in_report: next })
        .eq("id", row.id)
        .eq("partner_id", partnerId);
      if (error) throw error;
      setRows((prev)=> prev.map((x)=> x.id===row.id ? { ...x, show_in_report: next } : x));
    } catch (e: any) {
      console.error("[ActionPlans] toggle error:", e);
      showError(e?.message || "Falha ao atualizar visibilidade.");
    } finally {
      setSaving(false);
    }
  };

  if (!partnerId) {
    return (
      <Card className="p-6"><div className="text-sm text-muted-foreground">Selecione uma empresa e autentique-se para gerenciar os Planos de Ação.</div></Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6"><LoadingSpinner size={32} /><span className="ml-2 text-muted-foreground">Carregando...</span></div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planos de Ação</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Novo Plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Nome</div>
                <Input value={formTitle} onChange={(e)=> setFormTitle(e.target.value)} placeholder="Ex.: Comunicação Efetiva" />
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Categoria</div>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c)=> (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium">Pontuação mínima</div>
                  <Input type="number" step="0.01" min="0" max="100" value={formScoreMin} onChange={(e)=> setFormScoreMin(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium">Pontuação máxima</div>
                  <Input type="number" step="0.01" min="0" max="100" value={formScoreMax} onChange={(e)=> setFormScoreMax(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show" checked={formShow} onCheckedChange={(v)=> setFormShow(Boolean(v))} />
                <label htmlFor="show" className="text-sm">Mostrar no relatório</label>
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Conteúdo</div>
                <Textarea rows={5} placeholder="Descreva o plano de ação..." value={formDescription} onChange={(e)=> setFormDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              {editing ? (
                <Button onClick={onUpdate} disabled={saving}>Salvar alterações</Button>
              ) : (
                <Button onClick={onCreate} disabled={saving}>Salvar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Cadastre planos por categoria e faixa de pontuação. Planos do parceiro substituem os globais no relatório.</div>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">Categoria</TableHead>
              <TableHead className="text-white w-[160px]">Faixa</TableHead>
              <TableHead className="text-white w-[120px]">Status</TableHead>
              <TableHead className="text-white">Conteúdo</TableHead>
              <TableHead className="text-white w-[140px] text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r)=>{
              const catName = categories.find(c=> c.id===r.category_id)?.name || "—";
              const band = `${r.score_min ?? 0} - ${r.score_max ?? 100}`;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title || "—"}</TableCell>
                  <TableCell>{catName}</TableCell>
                  <TableCell>{band}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={!!r.show_in_report} onCheckedChange={(v)=> onToggleShow(r, Boolean(v))} />
                      <span className="text-xs text-muted-foreground">Mostrar</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[420px] whitespace-pre-wrap text-sm text-slate-700">{r.description}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={()=> openEdit(r)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={()=> onDelete(r)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length===0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Nenhum plano cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ActionPlans;
