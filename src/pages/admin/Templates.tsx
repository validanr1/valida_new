"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showError, showSuccess } from "@/utils/toast";
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
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type DocumentTemplate = {
  id: string;
  name: string;
  content?: string | null;
  type: string;
  status: "active" | "inactive" | "draft";
  created_at?: string;
  updated_at?: string;
};

const Templates = () => {
  const { session } = useSession(); // Use the reactive session
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("document");
  const [status, setStatus] = useState<DocumentTemplate["status"]>("active");

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(null);

  const hasPermission = (permission: string) => {
    return session?.roleContext === "SuperAdmin" || (session?.permissions?.includes(permission) ?? false);
  };

  useEffect(() => {
    // Re-fetch data if session changes (e.g., user logs in/out, or permissions change)
    if (!session?.user_id || !hasPermission("admin:settings:templates:write")) {
      setTemplates([]);
      return;
    }

    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("name", { ascending: true });
      if (error) {
        console.error("Error loading document templates:", error);
        showError("Falha ao carregar templates de documentos.");
        return;
      }
      if (mounted) setTemplates((data as DocumentTemplate[]) ?? []);
    })();
    return () => { mounted = false; };
  }, [session?.user_id, hasPermission]); // Depend on reactive session.user_id and hasPermission

  const resetForm = () => {
    setEditing(null);
    setName("");
    setContent("");
    setType("document");
    setStatus("active");
  };

  const openCreate = () => {
    if (!hasPermission("admin:settings:templates:write")) {
      showError("Você não tem permissão para criar templates.");
      return;
    }
    resetForm();
    setOpen(true);
  };

  const openEdit = (t: DocumentTemplate) => {
    if (!hasPermission("admin:settings:templates:write")) {
      showError("Você não tem permissão para editar templates.");
      return;
    }
    setEditing(t);
    setName(t.name);
    setContent(t.content ?? "");
    setType(t.type);
    setStatus(t.status);
    setOpen(true);
  };

  const onSave = async () => {
    if (!hasPermission("admin:settings:templates:write")) {
      showError("Você não tem permissão para salvar templates.");
      return;
    }
    if (!name.trim()) {
      showError("Informe o nome do template.");
      return;
    }

    const payload: Partial<DocumentTemplate> = {
      id: editing?.id,
      name: name.trim(),
      content: content.trim() || null,
      type,
      status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("document_templates")
      .upsert(payload as any)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to save document template:", error);
      showError("Não foi possível salvar o template.");
      return;
    }
    const saved = data as DocumentTemplate;
    setTemplates((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    setOpen(false);
    showSuccess(editing ? "Template atualizado." : "Template criado.");
  };

  const onDelete = (t: DocumentTemplate) => {
    if (!hasPermission("admin:settings:templates:write")) {
      showError("Você não tem permissão para excluir templates.");
      return;
    }
    setDeleteTarget(t);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!hasPermission("admin:settings:templates:write")) {
      showError("Você não tem permissão para excluir templates.");
      return;
    }
    const { error } = await supabase.from("document_templates").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir template.");
      return;
    }
    setTemplates((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Template excluído.");
  };

  const totalTemplates = useMemo(() => templates.length, [templates]);

  if (!hasPermission("admin:settings:templates:write")) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Você não tem permissão para visualizar esta página.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Templates de Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie templates para documentos, e-mails ou relatórios. Total: {totalTemplates}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Novo Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Template</label>
                  <Input
                    placeholder="Ex.: Relatório de Avaliação Padrão"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 focus-brand-glow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-10 focus-brand-glow">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Documento</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="report">Relatório</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  placeholder="Conteúdo do template (HTML, Markdown, texto puro...)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="focus-brand-glow"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v: DocumentTemplate["status"]) => setStatus(v)}>
                  <SelectTrigger className="h-10 focus-brand-glow">
                    <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            <DialogFooter>
              <Button onClick={onSave}>
                {editing ? "Salvar alterações" : "Criar Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
                <TableHead className="text-white">Tipo</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Criado em</TableHead>
                <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const statusClasses =
                  t.status === "inactive"
                    ? "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-red-100 border-red-200 text-red-700"
                    : t.status === "draft"
                      ? "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-yellow-100 border-yellow-200 text-yellow-700"
                      : "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-emerald-100 border-emerald-200 text-emerald-700";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="capitalize">{t.type}</TableCell>
                    <TableCell>
                      <span className={statusClasses}>{t.status === "active" ? "Ativo" : t.status === "inactive" ? "Inativo" : "Rascunho"}</span>
                    </TableCell>
                    <TableCell>{new Date(t.created_at!).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(t)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum template de documento cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template{" "}
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

export default Templates;