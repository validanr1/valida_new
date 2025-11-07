import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showError, showSuccess } from "@/utils/toast";

// DB types
interface Category { id: string; name: string; status?: string | null; order?: number | null }
interface PlanRow {
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

const ActionPlansAdmin: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const totalRows = useMemo(() => rows.length, [rows]);

  // Create/Edit modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formScoreMin, setFormScoreMin] = useState<string>("0");
  const [formScoreMax, setFormScoreMax] = useState<string>("74.99");
  const [formShow, setFormShow] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  // Delete confirmation modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlanRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadAll = async () => {
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
          .eq("is_global", true),
      ]);
      if (catsRes.error) throw catsRes.error;
      if (plansRes.error) throw plansRes.error;
      const cats = (catsRes.data as Category[]) || [];
      setCategories(cats);
      setRows(((plansRes.data as PlanRow[]) || []).sort((a,b)=> (a.title||"").localeCompare(b.title||"")));
    } catch (e: any) {
      console.error("[ActionPlansAdmin] loadAll error:", e);
      showError(e?.message || "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const onUpdateGlobalPlan = async () => {
    const title = formTitle.trim();
    const categoryId = formCategoryId;
    const description = formDescription.trim();
    const show = !!formShow;
    const scoreMin = formScoreMin ? Number(formScoreMin) : null;
    const scoreMax = formScoreMax ? Number(formScoreMax) : null;
    if (!editing) return;
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
      } as Partial<PlanRow>;
      const { error, data } = await (supabase as any)
        .from("action_plans")
        .update(payload)
        .eq("id", editing.id)
        .eq("is_global", true)
        .select("*");
      if (error) throw error;
      const row = ((data as PlanRow[]) || [])[0];
      if (row && row.id) {
        setRows((prev)=> prev.map(x => x.id === row.id ? row : x));
      } else {
        // Fallback: if no row returned (due to RLS/filters), reload list
        await loadAll();
      }
      setOpen(false);
      resetForm();
      showSuccess("Plano global atualizado.");
    } catch (e: any) {
      console.error("[ActionPlansAdmin] update plan error:", e);
      showError(e?.message || "Falha ao atualizar plano.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Ensure categories are present when opening the modal
  useEffect(() => {
    if (open && categories.length === 0 && !loading) {
      loadAll();
    }
  }, [open]);

  // Categories are managed in Admin > Questionários; here we only consume active question categories.

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
  const openEdit = (row: PlanRow) => {
    setEditing(row);
    setFormTitle(row.title || "");
    setFormCategoryId(row.category_id || "");
    setFormScoreMin(typeof row.score_min === 'number' ? String(row.score_min) : "");
    setFormScoreMax(typeof row.score_max === 'number' ? String(row.score_max) : "");
    setFormShow(!!row.show_in_report);
    setFormDescription(row.description || "");
    setOpen(true);
  };

  const onCreateGlobalPlan = async () => {
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
      // Attempt with new columns
      const payloadFull = {
        category_id: categoryId,
        title,
        description,
        is_global: true,
        partner_id: null,
        show_in_report: show,
        score_min: scoreMin,
        score_max: scoreMax,
      } as Partial<PlanRow>;
      let insertRes = await (supabase as any)
        .from("action_plans")
        .insert(payloadFull)
        .select("*");
      if (insertRes.error) {
        const msg = String(insertRes.error.message || insertRes.error).toLowerCase();
        const needsFallback = msg.includes("column") && (msg.includes("score_") || msg.includes("title"));
        if (needsFallback) {
          // Retry without new columns for environments where migration hasn't applied yet
          const payloadFallback = {
            category_id: categoryId,
            description,
            is_global: true,
            partner_id: null,
            show_in_report: show,
          } as Partial<PlanRow>;
          insertRes = await (supabase as any)
            .from("action_plans")
            .insert(payloadFallback)
            .select("*");
          if (!insertRes.error) {
            showError("Plano criado sem faixa de pontuação (migração pendente).");
          }
        }
      }
      if (insertRes.error) throw insertRes.error;
      const row = ((insertRes.data as PlanRow[]) || [])[0];
      setRows((prev)=> row ? [row, ...prev] : prev);
      setOpen(false);
      setFormTitle(""); setFormCategoryId(""); setFormScoreMin("0"); setFormScoreMax("74.99"); setFormShow(true); setFormDescription("");
      showSuccess("Plano global criado.");
    } catch (e: any) {
      console.error("[ActionPlansAdmin] create plan error:", e);
      showError(e?.message || "Falha ao criar plano.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (row: PlanRow) => {
    setDeleteTarget(row);
    setDeleteConfirmText("");
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.toLowerCase() !== "excluir") {
      showError('Digite "EXCLUIR" para confirmar.');
      return;
    }
    setSaving(true);
    try {
      console.log("[ActionPlansAdmin] Tentando deletar plano:", deleteTarget.id);
      const { error, data, count } = await (supabase as any)
        .from("action_plans")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("is_global", true)
        .select();
      
      console.log("[ActionPlansAdmin] Resultado da exclusão:", { error, data, count });
      
      if (error) {
        console.error("[ActionPlansAdmin] Erro ao deletar:", error);
        throw error;
      }
      
      setRows((prev)=> prev.filter((x)=> x.id!==deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      showSuccess("Plano global excluído.");
    } catch (e: any) {
      console.error("[ActionPlansAdmin] delete plan error:", e);
      showError(`Erro ao excluir: ${e?.message || "Falha desconhecida"}. Verifique o console para mais detalhes.`);
    } finally {
      setSaving(false);
    }
  };

  const onToggleShow = async (row: PlanRow, next: boolean) => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("action_plans")
        .update({ show_in_report: next })
        .eq("id", row.id)
        .eq("is_global", true);
      if (error) throw error;
      setRows((prev)=> prev.map((x)=> x.id===row.id ? { ...x, show_in_report: next } : x));
    } catch (e: any) {
      console.error("[ActionPlansAdmin] toggle plan error:", e);
      showError(e?.message || "Falha ao atualizar visibilidade.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6"><LoadingSpinner size={32} /><span className="ml-2 text-muted-foreground">Carregando...</span></div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Planos de Ação (Globais)</h1>
          <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground bg-muted">Cadastrados: {totalRows}</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Novo Plano Global</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Plano Global" : "Novo Plano Global"}</DialogTitle>
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
                <Button onClick={onUpdateGlobalPlan} disabled={saving}>Salvar alterações</Button>
              ) : (
                <Button onClick={onCreateGlobalPlan} disabled={saving}>Salvar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Gerencie categorias e planos globais. Eles são usados como fallback quando o parceiro não cadastrar seus próprios planos.</div>
      </Card>

      {/* Categorias vêm de question_categories (ativas). Edição ocorre em Admin > Configurações > Questionários. */}

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-[160px]">Faixa</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
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
                      <Button variant="destructive" size="sm" onClick={()=> openDelete(r)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length===0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Nenhum plano global cadastrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o plano de ação <strong>"{deleteTarget?.title || "sem título"}"</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Digite <span className="font-bold text-destructive">EXCLUIR</span> para confirmar:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              disabled={saving || deleteConfirmText.toLowerCase() !== "excluir"}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionPlansAdmin;
