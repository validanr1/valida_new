"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

type Item = {
  id: string;
  name: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

type Props = {
  title: string;
  collectionKey: string; // interpretado como nome da tabela no Supabase
  emptyMessage?: string;
  createLabel?: string;
  nameLabel?: string;
};

const SimpleManager = ({ title, collectionKey, emptyMessage = "Nenhum registro.", createLabel = "Novo", nameLabel = "Nome" }: Props) => {
  const { session } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const canView = Boolean(isSuperAdmin || session?.permissions?.includes('admin:settings:read'));

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Verificar se o usuário é SuperAdmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!session?.user?.id) {
        setIsSuperAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc('is_super_admin');
      if (!error && data) {
        setIsSuperAdmin(true);
      } else {
        setIsSuperAdmin(false);
      }
    };
    checkSuperAdmin();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!canView) return;
    
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from(collectionKey)
        .select("id,name,status") // Ajustado para selecionar apenas colunas existentes em todas as tabelas
        .order("name", { ascending: true });
        
      if (error) {
        console.error(`Erro ao carregar ${collectionKey}:`, error);
        showError(`Falha ao carregar ${title.toLowerCase()}`);
        return;
      }
      
      if (mounted) setItems((data as Item[]) ?? []);
    })();
    return () => { mounted = false; };
  }, [collectionKey, title, canView]);

  const sorted = useMemo(() => [...items], [items]);

  const openCreate = () => {
    if (!isSuperAdmin) {
      showError("Ação restrita a Super Administradores");
      return;
    }
    setEditing(null);
    setName("");
    setStatus("active");
    setOpen(true);
  };

  const openEdit = (it: Item) => {
    if (!isSuperAdmin) {
      showError("Ação restrita a Super Administradores");
      return;
    }
    setEditing(it);
    setName(it.name ?? "");
    setStatus(it.status ?? "active");
    setOpen(true);
  };

  const onSave = async () => {
    if (!isSuperAdmin) {
      showError("Ação restrita a Super Administradores");
      return;
    }
    
    if (!name.trim()) {
      showError("Informe o nome.");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from(collectionKey)
        .upsert({ 
          id: editing?.id, 
          name: name.trim(), 
          status,
        } as any)
        .select("id,name,status")
        .single();
        
      if (error) {
        console.error(`Erro ao salvar ${collectionKey}:`, error);
        showError(`Não foi possível salvar o registro: ${error.message}`);
        return;
      }
      
      const saved = data as Item;

      // Log audit trail
      if (session?.user?.id) {
        const auditAction = editing ? "Atualizou registro" : "Criou registro";
        const { error: auditError } = await supabase.from("audit_logs").insert({
          user_id: session.user.id,
          action: auditAction,
          entity: title,
          payload_json: { item_id: saved.id, item_name: saved.name, collection: collectionKey },
        });
        if (auditError) {
          console.error(`[SimpleManager] Falha ao registrar log de auditoria:`, auditError);
        }
      }

      setItems((prev) => {
        const exists = prev.some((x) => x.id === saved.id);
        return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
      });
      
      setOpen(false);
      setEditing(null);
      setName("");
      setStatus("active");
      showSuccess(editing ? "Registro atualizado." : "Registro criado.");
      
    } catch (err) {
      console.error(`Erro inesperado ao salvar ${collectionKey}:`, err);
      showError("Erro inesperado ao salvar o registro.");
    }
  };

  const onDelete = async (id: string) => {
    if (!isSuperAdmin) {
      showError("Ação restrita a Super Administradores");
      return;
    }
    
    if (!confirm("Excluir este registro?")) return;
    
    const itemToDelete = items.find((it) => it.id === id);

    try {
      const { error } = await supabase.from(collectionKey).delete().eq("id", id);
      if (error) {
        console.error(`Erro ao excluir ${collectionKey}:`, error);
        showError("Falha ao excluir registro.");
        return;
      }

      // Log audit trail
      if (session?.user?.id && itemToDelete) {
        const { error: auditError } = await supabase.from("audit_logs").insert({
          user_id: session.user.id,
          action: "Excluiu registro",
          entity: title,
          payload_json: { item_id: itemToDelete.id, item_name: itemToDelete.name, collection: collectionKey },
        });
        if (auditError) {
          console.error(`[SimpleManager] Falha ao registrar log de auditoria para exclusão:`, auditError);
        }
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
      showSuccess("Registro excluído.");
    } catch (err) {
      console.error(`Erro inesperado ao excluir ${collectionKey}:`, err);
      showError("Erro inesperado ao excluir o registro.");
    }
  };

  if (!canView) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Acesso restrito
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ {createLabel}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-2">
                <label className="text-sm font-medium">{nameLabel}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v: "active" | "inactive") => setStatus(v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onSave}>{editing ? "Salvar alterações" : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D]">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${it.status === "active" ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
                    {it.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(it.id)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SimpleManager;