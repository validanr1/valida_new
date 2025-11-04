"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
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

type Category = { id: string; name: string; description?: string; status: "active" | "inactive"; order?: number };
type Question = { id: string; category_id?: string | null; text: string; kind?: "direct" | "inverse"; status: "active" | "inactive"; order?: number };
type ScaleItem = { id: string; label: string; value: number; order: number };

async function ensureDefaultScale(): Promise<ScaleItem[]> {
  const { data: list } = await supabase.from("answer_scale").select("*").order("order", { ascending: true });
  if (list && list.length > 0) return list as ScaleItem[];

  const seed = [
    { label: "NUNCA", value: 0, order: 1 },
    { label: "RARAMENTE", value: 25, order: 2 },
    { label: "ÀS VEZES", value: 50, order: 3 },
    { label: "FREQUENTEMENTE", value: 75, order: 4 },
    { label: "SEMPRE", value: 100, order: 5 },
  ];
  const { data: inserted } = await supabase.from("answer_scale").insert(seed as any).select("*").order("order", { ascending: true });
  return (inserted as ScaleItem[]) ?? seed.map((s, i) => ({ ...s, id: `s-${i}` }));
}

const Questionnaires = () => {
  const { session } = useSession();
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catStatus, setCatStatus] = useState<"active" | "inactive">("active");
  const [catOrder, setCatOrder] = useState<string>("");

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qOpen, setQOpen] = useState(false);
  const [qEditing, setQEditing] = useState<Question | null>(null);
  const [qCategoryId, setQCategoryId] = useState<string | undefined>(undefined);
  const [qText, setQText] = useState("");
  const [qKind, setQKind] = useState<"direct" | "inverse">("direct");
  const [qStatus, setQStatus] = useState<"active" | "inactive">("active");
  const [qOrder, setQOrder] = useState<string>("");

  // Filter
  const [filterCat, setFilterCat] = useState<string>("all");

  // Scale
  const [scale, setScale] = useState<ScaleItem[]>([]);

  // Delete confirmations
  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [deleteQOpen, setDeleteQOpen] = useState(false);
  const [deleteQTarget, setDeleteQTarget] = useState<Question | null>(null);

  console.log("Questionnaires: Rendered", { qOpen, catOpen });

  useEffect(() => {
    console.log("Questionnaires: Mounted");
    return () => {
      console.log("Questionnaires: Unmounted");
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("Questionnaires: Document visibility changed:", document.visibilityState);
      if (document.visibilityState === 'visible' && qOpen) {
        console.log("Questionnaires: Document became visible, question dialog was open.");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [qOpen]);

  useEffect(() => {
    console.log("Questionnaires: qOpen state changed to:", qOpen);
    if (!qOpen) {
      console.log("Questionnaires: qOpen is false, dialog should be closed.");
      resetQuestionForm();
    }
  }, [qOpen]);

  useEffect(() => {
    if (!session?.user?.id) {
      setCategories([]);
      setQuestions([]);
      setScale([]);
      return;
    }

    let mounted = true;
    (async () => {
      console.log("Questionnaires: Fetching initial data...");
      const [{ data: cats }, { data: qs }] = await Promise.all([
        supabase.from("question_categories").select("*").order("order", { ascending: true }),
        supabase.from("questions").select("*").order("order", { ascending: true }),
      ]);
      if (!mounted) return;
      setCategories((cats as Category[]) ?? []);
      setQuestions((qs as Question[]) ?? []);
      const sc = await ensureDefaultScale();
      if (mounted) setScale(sc);
      console.log("Questionnaires: Initial data fetched.");
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const catsSorted = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "pt-BR")),
    [categories],
  );

  const visibleQuestions = useMemo(() => {
    const base = [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (filterCat === "all") return base;
    return base.filter((q) => q.category_id === filterCat);
  }, [questions, filterCat]);

  // Handlers (categories)
  const openCreateCat = () => {
    setCatEditing(null);
    setCatName("");
    setCatDesc("");
    setCatStatus("active");
    setCatOrder("");
    setCatOpen(true);
  };
  const openEditCat = (c: Category) => {
    setCatEditing(c);
    setCatName(c.name ?? "");
    setCatDesc(c.description ?? "");
    setCatStatus(c.status ?? "active");
    setCatOrder(String(c.order ?? ""));
    setCatOpen(true);
  };
  const saveCat = async () => {
    if (!catName.trim()) {
      showError("Informe o nome da categoria.");
      return;
    }
    const payload = {
      id: catEditing?.id,
      name: catName.trim(),
      description: catDesc.trim() || null,
      status: catStatus,
      order: Number(catOrder) || null,
    } as any;
    const { data, error } = await supabase.from("question_categories").upsert(payload).select("*").single();
    if (error) {
      showError("Não foi possível salvar a categoria.");
      return;
    }
    const saved = data as Category;
    setCategories((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    setCatOpen(false);
    showSuccess(catEditing ? "Categoria atualizada." : "Categoria criada.");
  };

  // Open delete confirmation for category
  const openDeleteCat = (c: Category) => {
    setDeleteCatTarget(c);
    setDeleteCatOpen(true);
  };
  const confirmDeleteCat = async () => {
    if (!deleteCatTarget) return;
    const id = deleteCatTarget.id;
    const { error } = await supabase.from("question_categories").delete().eq("id", id);
    if (error) {
      showError("Falha ao excluir a categoria.");
      return;
    }
    // Remove a categoria e desvincula perguntas locais (manter consistência visual)
    setCategories((prev) => prev.filter((x) => x.id !== id));
    setQuestions((prev) => prev.map((q) => (q.category_id === id ? { ...q, category_id: null } : q)));
    setDeleteCatOpen(false);
    setDeleteCatTarget(null);
    showSuccess("Categoria excluída.");
  };

  // Handlers (questions)
  const resetQuestionForm = () => {
    setQEditing(null);
    setQCategoryId(undefined);
    setQText("");
    setQKind("direct");
    setQStatus("active");
    setQOrder("");
  };

  const openCreateQ = () => {
    resetQuestionForm();
    setQOpen(true);
  };
  const openEditQ = (q: Question) => {
    setQEditing(q);
    setQCategoryId(q.category_id ?? undefined);
    setQText(q.text);
    setQKind(q.kind ?? "direct");
    setQStatus(q.status ?? "active");
    setQOrder(String(q.order ?? ""));
    setQOpen(true);
  };
  const saveQ = async () => {
    if (!qText.trim()) {
      showError("Informe o texto da pergunta.");
      return;
    }
    const payload = {
      id: qEditing?.id,
      category_id: qCategoryId ?? null,
      text: qText.trim(),
      kind: qKind,
      status: qStatus,
      order: Number(qOrder) || null,
    } as any;
    const { data, error } = await supabase.from("questions").upsert(payload).select("*").single();
    if (error) {
      showError("Não foi possível salvar a pergunta.");
      return;
    }
    const saved = data as Question;
    setQuestions((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    setQOpen(false);
    showSuccess(qEditing ? "Pergunta atualizada." : "Pergunta criada.");
  };

  // Open delete confirmation for question
  const openDeleteQ = (q: Question) => {
    setDeleteQTarget(q);
    setDeleteQOpen(true);
  };
  const confirmDeleteQ = async () => {
    if (!deleteQTarget) return;
    const id = deleteQTarget.id;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      showError("Falha ao excluir a pergunta.");
      return;
    }
    setQuestions((prev) => prev.filter((x) => x.id !== id));
    setDeleteQOpen(false);
    setDeleteQTarget(null);
    showSuccess("Pergunta excluída.");
  };

  // Scale
  const saveScale = async () => {
    const norm = [...scale]
      .map((s, idx) => ({ ...s, order: idx + 1, value: Math.max(0, Math.min(100, Number(s.value) || 0)) }))
      .sort((a, b) => a.order - b.order);
    const { error } = await supabase.from("answer_scale").upsert(norm as any);
    if (error) {
      showError("Não foi possível salvar a escala.");
      return;
    }
    setScale(norm);
    showSuccess("Escala salva.");
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="categorias">
        <TabsList className="w-full grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="categorias" className="w-full">Categorias</TabsTrigger>
          <TabsTrigger value="perguntas" className="w-full">Perguntas</TabsTrigger>
          <TabsTrigger value="escala" className="w-full">Escala de Respostas</TabsTrigger>
        </TabsList>

        {/* Categorias */}
        <TabsContent value="categorias" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Categorias</div>
              <div className="text-xs text-muted-foreground">Organize suas perguntas por categoria.</div>
            </div>
            <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) setCatEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateCat}>+ Nova Categoria</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{catEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input value={catName} onChange={(e) => setCatName(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição (opcional)</label>
                    <Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} rows={3} className="rounded-xl" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={catStatus} onValueChange={(v: "active" | "inactive") => setCatStatus(v)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Ativa</SelectItem><SelectItem value="inactive">Inativa</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ordem</label>
                      <Input type="number" inputMode="numeric" value={catOrder} onChange={(e) => setCatOrder(e.target.value)} className="h-10 rounded-xl" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveCat}>{catEditing ? "Salvar alterações" : "Salvar"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1B365D] hover:bg-[#1B365D]">
                  <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
                  <TableHead className="text-white">Descrição</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Ordem</TableHead>
                  <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catsSorted.length > 0 ? (
                  catsSorted.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.description ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${c.status === "active" ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
                          {c.status === "active" ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell>{typeof c.order === "number" ? c.order : "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditCat(c)}>Editar</Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteCat(c)}>Excluir</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Perguntas */}
        <TabsContent value="perguntas" className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium">Perguntas</div>
                <div className="text-xs text-muted-foreground">Gerencie as perguntas por categoria.</div>
              </div>
              <div className="w-[220px]">
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {catsSorted.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Dialog open={qOpen} onOpenChange={setQOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateQ}>+ Nova Pergunta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{qEditing ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texto da Pergunta</label>
                    <Textarea value={qText} onChange={(e) => setQText(e.target.value)} rows={3} className="rounded-xl" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoria</label>
                      <Select value={qCategoryId} onValueChange={setQCategoryId}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          {catsSorted.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo</label>
                      <Select value={qKind} onValueChange={(v: "direct" | "inverse") => setQKind(v)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direta (0-100%)</SelectItem>
                          <SelectItem value="inverse">Invertida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={qStatus} onValueChange={(v: "active" | "inactive") => setQStatus(v)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativa</SelectItem>
                          <SelectItem value="inactive">Inativa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ordem</label>
                    <Input type="number" inputMode="numeric" value={qOrder} onChange={(e) => setQOrder(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveQ}>{qEditing ? "Salvar alterações" : "Salvar"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1B365D] hover:bg-[#1B365D]">
                  <TableHead className="text-white first:rounded-tl-xl">Categoria</TableHead>
                  <TableHead className="text-white">Pergunta</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Ordem</TableHead>
                  <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleQuestions.length > 0 ? (
                  visibleQuestions.map((q) => {
                    const cat = q.category_id ? categories.find((c) => c.id === q.category_id) : undefined;
                    return (
                      <TableRow key={q.id}>
                        <TableCell>{cat?.name ?? "—"}</TableCell>
                        <TableCell className="max-w-[680px]">{q.text}</TableCell>
                        <TableCell className="capitalize">{q.kind ?? "direct"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${q.status === "active" ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
                            {q.status === "active" ? "Ativa" : "Inativa"}
                          </span>
                        </TableCell>
                        <TableCell>{typeof q.order === "number" ? q.order : "—"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openEditQ(q)}>Editar</Button>
                          <Button size="sm" variant="destructive" onClick={() => openDeleteQ(q)}>Excluir</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Escala */}
        <TabsContent value="escala" className="pt-4 space-y-3">
          <div>
            <div className="text-sm font-medium">Escala de Respostas</div>
            <div className="text-xs text-muted-foreground">Esta é a escala padrão utilizada. A inversão é calculada automaticamente (100 - valor).</div>
          </div>

          <Card className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1B365D] hover:bg-[#1B365D]">
                  <TableHead className="text-white first:rounded-tl-xl">#</TableHead>
                  <TableHead className="text-white">Rótulo</TableHead>
                  <TableHead className="text-white">Direta</TableHead>
                  <TableHead className="text-white last:rounded-tr-xl">Invertida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scale
                  .sort((a, b) => a.order - b.order)
                  .map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="max-w-[380px]">
                        <Input
                          value={s.label}
                          onChange={(e) => setScale((prev) => prev.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
                          className="h-10 rounded-xl"
                        />
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step={1}
                          value={s.value}
                          onChange={(e) => setScale((prev) => prev.map((x) => (x.id === s.id ? { ...x, value: Number(e.target.value) } : x)))}
                          className="h-10 rounded-xl"
                        />
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <div className="rounded-md border px-3 py-2 text-sm">{100 - (Number(s.value) || 0)}%</div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveScale}>Salvar escala</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de confirmação: excluir categoria */}
      <AlertDialog open={deleteCatOpen} onOpenChange={setDeleteCatOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria{" "}
              <span className="font-medium text-foreground">{deleteCatTarget?.name ?? "selecionada"}</span>?
              As perguntas vinculadas permanecerão existentes, porém sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteCat}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação: excluir pergunta */}
      <AlertDialog open={deleteQOpen} onOpenChange={setDeleteQOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pergunta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pergunta?
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteQ}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Questionnaires;