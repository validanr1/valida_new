import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
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
import { Plus, Filter } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { userManagementService, UserDisplay, Partner, RoleProfile } from "@/services/userManagement";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession
import { currentSession } from "@/services/auth";

const UserManagement = () => {
  const { session } = useSession(); // Use the reactive session
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [allUsers, setAllUsers] = useState<UserDisplay[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Form state
  const [email, setEmail] = useState("");
  // Removed password field/state from modal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRoleProfileId, setSelectedRoleProfileId] = useState<string | undefined>(undefined);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDisplay | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterPartnerId, setFilterPartnerId] = useState<string | undefined>(undefined);
  const [filterRoleProfileId, setFilterRoleProfileId] = useState<string | undefined>(undefined);
  const [filterQuery, setFilterQuery] = useState("");

  const fetchData = async () => {
    setLoadingList(true);
    try {
      const data = await userManagementService.listUsers();
      setAllUsers(data.users ?? []);
      setPartners(data.partners ?? []);
      setRoleProfiles(data.roleProfiles ?? []);
    } catch (error: any) {
      console.error("UserManagement page: Failed to fetch users data:", error);
      showError(error.message || "Falha ao carregar dados dos usuários.");
      setAllUsers([]);
      setPartners([]);
      setRoleProfiles([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    // Re-fetch data if session changes (e.g., user logs in/out, or permissions change)
    if (!session?.user?.id) {
      setAllUsers([]);
      setPartners([]);
      setRoleProfiles([]);
      setLoadingList(false);
      setCanCreate(false);
      setCanUpdate(false);
      setCanDelete(false);
      return;
    }
    // Derive permissions from local session for UI gating (supports both 'users:*' and 'admin:users:*')
    (async () => {
      try {
        const ls = await currentSession();
        const perms = ls?.permissions || [];
        const has = (perm: string) => {
          if (perms.includes(perm)) return true;
          const adminPrefixed = `admin:${perm}`; // e.g., users:create -> admin:users:create
          if (perms.includes(adminPrefixed)) return true;
          const base = perm.split(":")[0];
          const wildcard = `${base}:*`; // e.g., users:*
          if (perms.includes(wildcard)) return true;
          const adminWildcard = `admin:${base}:*`; // e.g., admin:users:*
          return perms.includes(adminWildcard);
        };
        setCanCreate(has("users:create"));
        setCanUpdate(has("users:update"));
        setCanDelete(has("users:delete"));
      } catch (e) {
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
      }
    })();
    fetchData();
  }, [session?.user?.id]); // Depend on reactive session.user.id

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setSelectedRoleProfileId(undefined);
    setSelectedPartnerId(undefined);
    setEditingId(undefined);
    setIsEditing(false);
    // Removed password visibility reset
  };

  const openCreate = () => {
    if (!canCreate) {
      showError("Permissão insuficiente: você não pode criar usuários.");
      return;
    }
    resetForm();
    setOpen(true);
  };

  const openEdit = (user: UserDisplay) => {
    if (!canUpdate) {
      showError("Permissão insuficiente: você não pode editar usuários.");
      return;
    }
    setIsEditing(true);
    setEditingId(user.id);
    setEmail(user.email);
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setSelectedRoleProfileId(user.roleProfileId);
    setSelectedPartnerId(user.partnerId);
    setOpen(true);
  };

  const onSave = async () => {
    if (isEditing && !canUpdate) {
      showError("Permissão insuficiente para editar usuários.");
      return;
    }
    if (!isEditing && !canCreate) {
      showError("Permissão insuficiente para criar usuários.");
      return;
    }
    if (!email.trim()) {
      showError("Informe o e-mail do usuário.");
      return;
    }
    if (!selectedRoleProfileId) {
      showError("Selecione um perfil para o usuário.");
      return;
    }
    // REMOVIDO: Validação estrita para partnerId.
    // O backend (Edge Function) já trata partnerId como opcional (null).

    setIsSaving(true);
    try {
      if (isEditing) {
        await userManagementService.updateUser({
          userId: editingId!,
          email: email.trim().toLowerCase(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          roleProfileId: selectedRoleProfileId,
          partnerId: selectedPartnerId,
        });
        // Sincroniza o nome/e-mail no parceiro vinculado (se houver)
        try {
          if (selectedPartnerId) {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            await supabase
              .from("partners")
              .update({
                responsible_name: fullName || null,
                responsible_email: email.trim().toLowerCase(),
              })
              .eq("id", selectedPartnerId);
          }
        } catch (syncErr) {
          console.warn("[UserManagement] Falha ao sincronizar responsável no parceiro:", syncErr);
        }
        showSuccess("Usuário atualizado.");
      } else {
        await userManagementService.createUser({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          roleProfileId: selectedRoleProfileId,
          partnerId: selectedPartnerId,
        });
        // Após criação, também tenta sincronizar no parceiro (quando já associado)
        try {
          if (selectedPartnerId) {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            await supabase
              .from("partners")
              .update({
                responsible_name: fullName || null,
                responsible_email: email.trim().toLowerCase(),
              })
              .eq("id", selectedPartnerId);
          }
        } catch (syncErr) {
          console.warn("[UserManagement] Falha ao sincronizar responsável no parceiro (criação):", syncErr);
        }
        showSuccess("Usuário criado. Um e-mail de convite foi enviado (ou usuário criado diretamente).");
      }
      setOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Failed to save user:", error);
      showError(error.message || "Não foi possível salvar o usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = (user: UserDisplay) => {
    if (!canDelete) {
      showError("Permissão insuficiente: você não pode excluir usuários.");
      return;
    }
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await userManagementService.deleteUser({ userId: deleteTarget.id });
      showSuccess("Usuário excluído.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      showError(error.message || "Não foi possível excluir o usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterPartnerChange = (v: string) => setFilterPartnerId(v === "all" ? undefined : v);
  const handleFilterRoleProfileChange = (v: string) => setFilterRoleProfileId(v === "all" ? undefined : v);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      if (filterPartnerId && user.partnerId !== filterPartnerId) return false;
      if (filterRoleProfileId && user.roleProfileId !== filterRoleProfileId) return false;
      if (filterQuery.trim()) {
        const q = filterQuery.trim().toLowerCase();
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();
        const email = user.email.toLowerCase();
        const partnerName = user.partnerName?.toLowerCase() || "";
        const roleName = user.roleProfileName?.toLowerCase() || "";
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          partnerName.includes(q) ||
          roleName.includes(q)
        );
      }
      return true;
    });
  }, [allUsers, filterPartnerId, filterRoleProfileId, filterQuery]);

  const totalUsers = useMemo(() => filteredUsers.length, [filteredUsers]);

  const resetFilters = () => {
    setFilterPartnerId(undefined);
    setFilterRoleProfileId(undefined);
    setFilterQuery("");
  };

  const selectedProfileTarget = useMemo(() => {
    return roleProfiles.find(rp => rp.id === selectedRoleProfileId)?.target;
  }, [roleProfiles, selectedRoleProfileId]);

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie todos os usuários da plataforma. Total: {totalUsers}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? "Esconder filtros" : "Mostrar filtros"}
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="whitespace-nowrap">
                <Plus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <label htmlFor="user-email" className="text-sm font-medium">E-mail</label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                {/* Campo de senha removido: convites serão enviados automaticamente pelo backend quando aplicável */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="user-first-name" className="text-sm font-medium">Nome</label>
                    <Input
                      id="user-first-name"
                      placeholder="Primeiro nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-last-name" className="text-sm font-medium">Sobrenome</label>
                    <Input
                      id="user-last-name"
                      placeholder="Último nome"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Perfil</label>
                  <Select 
                    value={selectedRoleProfileId || ""} 
                    onValueChange={(v) => { 
                      setSelectedRoleProfileId(v); 
                      const profile = roleProfiles.find(rp => rp.id === v); 
                      if (profile?.target === "admin") setSelectedPartnerId(undefined);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={roleProfiles.length ? "Selecione o perfil" : "Nenhum perfil disponível"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleProfiles.length === 0 ? (
                        <SelectItem value="no-profiles" disabled>Nenhum perfil disponível</SelectItem>
                      ) : (
                        roleProfiles.map((rp) => (
                          <SelectItem key={rp.id} value={rp.id}>
                            {rp.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Parceiro</label>
                  <Select
                    value={selectedPartnerId || "none-selected"} // Alterado para "none-selected"
                    onValueChange={(v) => setSelectedPartnerId(v === "none-selected" ? undefined : v)} // Lógica ajustada
                    disabled={selectedProfileTarget !== "partner" || partners.length === 0}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={
                        selectedProfileTarget !== "partner"
                          ? "Não aplicável"
                          : (partners.length ? "Selecione um parceiro (opcional)" : "Nenhum parceiro disponível")
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.length === 0 ? (
                        <SelectItem value="no-partners" disabled>Nenhum parceiro disponível</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="none-selected">Nenhum (opcional)</SelectItem> {/* Valor alterado */}
                          {partners.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Salvando..." : (isEditing ? "Salvar alterações" : "Salvar")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros (controlados pelo botão) */}
      <Card className={`p-4 ${showFilters ? "" : "hidden"}`}>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-sm font-medium mb-1">Parceiro</div>
            <Select value={filterPartnerId || ""} onValueChange={handleFilterPartnerChange}>
              <SelectTrigger><SelectValue placeholder="Todos os parceiros" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Perfil</div>
            <Select value={filterRoleProfileId || ""} onValueChange={handleFilterRoleProfileChange}>
              <SelectTrigger><SelectValue placeholder="Todos os perfis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {roleProfiles
                  .map((rp) => <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm font-medium mb-1">Buscar</div>
            <Input placeholder="Nome, e-mail, parceiro, perfil..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={resetFilters}>Limpar filtros</Button>
        </div>
      </Card>

      {/* Loading da lista */}
      {loadingList ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <LoadingSpinner size={20} />
          Carregando usuários...
        </div>
      ) : null}

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
                <TableHead className="text-white">E-mail</TableHead>
                <TableHead className="text-white">Perfil</TableHead>
                <TableHead className="text-white">Parceiro</TableHead>
                <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.roleProfileName ?? "—"}</TableCell>
                  <TableCell>{user.partnerName ?? "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)} disabled={!canUpdate}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDelete(user)} disabled={!canDelete}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && !loadingList && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
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
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">{deleteTarget?.email ?? "selecionado"}</span>?
              Esta ação não poderá ser desfeita e removerá o usuário do sistema de autenticação e de todos os perfis associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={isSaving}>
              {isSaving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;