import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import { userManagementService, UserDisplay, RoleProfile } from "@/services/userManagement";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/LoadingSpinner";

const Membros = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [allUsers, setAllUsers] = useState<UserDisplay[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRoleProfileId, setSelectedRoleProfileId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDisplay | null>(null);

  const fetchPartnerRoleProfiles = async (): Promise<RoleProfile[]> => {
    try {
      const { data, error } = await supabase
        .from("role_profiles")
        .select("id,name,target,status")
        .eq("target", "partner")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as RoleProfile[]) ?? [];
    } catch (err: any) {
      console.error("Membros: falha ao carregar perfis de acesso:", err);
      return [];
    }
  };

  const fetchData = async () => {
    setLoadingList(true);
    try {
      // Tenta carregar usuários via função (pode exigir SuperAdmin); não bloquear perfis
      try {
        const data = await userManagementService.listUsers();
        setAllUsers(data.users ?? []);
      } catch (e: any) {
        console.warn("Membros: listUsers falhou, mantendo lista vazia:", e?.message || e);
        setAllUsers([]);
      }

      // Carrega perfis diretamente do banco para garantir opções no modal
      const profiles = await fetchPartnerRoleProfiles();
      setRoleProfiles(profiles);
    } catch (error: any) {
      console.error("Membros: falha geral ao carregar dados:", error);
      showError(error.message || "Falha ao carregar membros do parceiro.");
      setAllUsers((prev) => prev ?? []);
      setRoleProfiles((prev) => prev ?? []);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setAllUsers([]);
      setRoleProfiles([]);
      setLoadingList(false);
      return;
    }
    fetchData();
  }, [session?.user?.id]);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setSelectedRoleProfileId(undefined);
    setEditingId(undefined);
    setIsEditing(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (user: UserDisplay) => {
    setIsEditing(true);
    setEditingId(user.id);
    setEmail(user.email);
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setSelectedRoleProfileId(user.roleProfileId);
    setOpen(true);
  };

  const onSave = async () => {
    if (!email.trim()) { showError("Informe o e-mail."); return; }
    if (!selectedRoleProfileId) { showError("Selecione o perfil de acesso."); return; }
    if (!partnerId) { showError("Sessão sem parceiro. Faça login novamente."); return; }

    setIsSaving(true);
    try {
      if (isEditing) {
        await userManagementService.updateUser({
          userId: editingId!,
          email: email.trim().toLowerCase(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          roleProfileId: selectedRoleProfileId,
          partnerId: partnerId,
        });
        showSuccess("Membro atualizado.");
      } else {
        await userManagementService.createUser({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          roleProfileId: selectedRoleProfileId,
          partnerId: partnerId,
        });
        showSuccess("Convite enviado para o novo membro.");
      }
      setOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Falha ao salvar membro:", error);
      showError(error.message || "Não foi possível salvar o membro.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = (user: UserDisplay) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await userManagementService.deleteUser({ userId: deleteTarget.id });
      showSuccess("Membro excluído.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      console.error("Falha ao excluir membro:", error);
      showError(error.message || "Não foi possível excluir o membro.");
    } finally {
      setIsSaving(false);
    }
  };

  const members = useMemo(() => {
    return allUsers.filter((u) => u.partnerId === partnerId && !!u.roleProfileId);
  }, [allUsers, partnerId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Membros do Parceiro</div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setIsEditing(false); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Novo Membro</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sobrenome</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Perfil de Acesso</label>
                <Select value={selectedRoleProfileId || ""} onValueChange={(v) => setSelectedRoleProfileId(v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleProfiles.map((rp) => (
                      <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button onClick={onSave} disabled={isSaving}>{isEditing ? "Salvar" : "Convidar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] text-white cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">E-mail</TableHead>
              <TableHead className="text-white">Perfil</TableHead>
              <TableHead className="text-white last:rounded-tr-xl">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingList && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-8 flex items-center justify-center"><LoadingSpinner size={24} /><span className="ml-2 text-muted-foreground">Carregando...</span></div>
                </TableCell>
              </TableRow>
            )}
            {!loadingList && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}><div className="py-6 text-center text-muted-foreground">Nenhum membro cadastrado.</div></TableCell>
              </TableRow>
            )}
            {!loadingList && members.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.roleProfileName || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <span className="mr-auto text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</span>
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => openDelete(u)}>Excluir</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário será removido e desvinculado do parceiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Membros;