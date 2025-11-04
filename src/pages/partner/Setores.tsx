import { useEffect, useState } from "react";
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
    if (session?.user_id && session?.partner_id) {
      const auditAction = editing ? "Atualizou Setor" : "Criou Setor";
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user_id,
        partner_id: session.partner_id,
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
    if (session?.user_id && session?.partner_id) {
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: session.user_id,
        partner_id: session.partner_id,
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
