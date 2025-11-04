"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type Profile = {
  id: string;
  name: string;
  target: "admin" | "partner";
  permissions: string[];
  status: "active" | "inactive";
};

// Nova estrutura de permissões: ambiente > módulo > função
const PERMISSIONS_STRUCTURE = {
  admin: {
    dashboard: [{ key: "admin:dashboard:view", label: "Ver Painel" }],
    partners: [
      { key: "admin:partners:read", label: "Ver Parceiros" },
      { key: "admin:partners:create", label: "Criar Parceiros" },
      { key: "admin:partners:update", label: "Editar Parceiros" },
      { key: "admin:partners:delete", label: "Excluir Parceiros" },
    ],
    plans: [
      { key: "admin:plans:read", label: "Ver Planos e Preços" },
      { key: "admin:plans:create", label: "Criar Planos" },
      { key: "admin:plans:update", label: "Editar Planos" },
      { key: "admin:plans:delete", label: "Excluir Planos" },
    ],
    sales: [
      { key: "admin:sales:read", label: "Ver Vendas" },
      { key: "admin:sales:write", label: "Gerir Vendas (Contratar/Alterar Planos)" },
    ],
    subscriptions: [
      { key: "admin:subscriptions:read", label: "Ver Assinaturas" },
      { key: "admin:subscriptions:write", label: "Gerir Assinaturas (Cancelar)" },
    ],
    billing: [
      { key: "admin:billing:read", label: "Ver Faturamento" },
      { key: "admin:billing:write", label: "Gerir Faturamento (Criar/Marcar Faturas)" },
    ],
    companies: [
      { key: "admin:companies:read", label: "Ver Empresas" },
      { key: "admin:companies:create", label: "Criar Empresas" },
      { key: "admin:companies:update", label: "Editar Empresas" },
      { key: "admin:companies:delete", label: "Excluir Empresas" },
    ],
    assessments: [{ key: "admin:assessments:view", label: "Ver Avaliações" }],
    reports: [{ key: "admin:reports:view", label: "Ver Denúncias/Relatórios" }],
    platform_ratings: [{ key: "admin:platform_ratings:read", label: "Ver Avaliações da Plataforma" }],
    emails: [{ key: "admin:emails:send", label: "Enviar E-mail" }], // Nova permissão
    settings: [
      { key: "admin:settings:read", label: "Ver Configurações Gerais" },
      { key: "admin:settings:write", label: "Gerir Configurações Gerais" },
      { key: "admin:settings:access_profiles:write", label: "Gerir Perfis de Acesso" },
      { key: "admin:settings:questionnaires:write", label: "Gerir Questionários" },
      { key: "admin:settings:templates:write", label: "Gerir Tipos de Avaliação" },
      { key: "admin:settings:risk_grades:write", label: "Gerir Graus de Risco" },
      { key: "admin:settings:levels:write", label: "Gerir Níveis" },
      { key: "admin:settings:email_templates:write", label: "Gerir Templates de E-mail" },
    ],
    users: [
      { key: "admin:users:read", label: "Ver Usuários" },
      { key: "admin:users:create", label: "Criar Usuários" },
      { key: "admin:users:update", label: "Editar Usuários" },
      { key: "admin:users:delete", label: "Excluir Usuários" },
    ],
  },
  partner: {
    dashboard: [{ key: "partner:dashboard:view", label: "Ver Painel" }],
    companies: [
      { key: "partner:companies:read", label: "Ver Empresas" },
      { key: "partner:companies:create", "label": "Criar Empresas" },
      { key: "partner:companies:update", "label": "Editar Empresas" },
      { key: "partner:companies:delete", "label": "Excluir Empresas" },
    ],
    departments: [
      { key: "partner:departments:read", label: "Ver Setores" },
      { key: "partner:departments:create", label: "Criar Setores" },
      { key: "partner:departments:update", label: "Editar Setores" },
      { key: "partner:departments:delete", label: "Excluir Setores" },
    ],
    roles: [
      { key: "partner:roles:read", label: "Ver Cargos" },
      { key: "partner:roles:create", label: "Criar Cargos" },
      { key: "partner:roles:update", label: "Editar Cargos" },
      { key: "partner:roles:delete", label: "Excluir Cargos" },
    ],
    employees: [
      { key: "partner:employees:read", label: "Ver Colaboradores" },
      { key: "partner:employees:create", label: "Criar Colaboradores" },
      { key: "partner:employees:update", label: "Editar Colaboradores" },
      { key: "partner:employees:delete", label: "Excluir Colaboradores" },
    ],
    reports: [{ key: "partner:reports:view", label: "Ver Denúncias" }],
    ges: [{ key: "partner:ges:view", label: "Ver GES" }],
    assessments: [{ key: "partner:assessments:view", label: "Ver Relatórios/Avaliações" }],
    links: [{ key: "partner:links:view", label: "Ver Links" }],
    profile: [{ key: "partner:profile:manage", label: "Gerenciar Perfil Pessoal" }],
    settings: [{ key: "partner:settings:manage", label: "Gerenciar Configurações do Parceiro" }],
  },
};

// Função para achatar a estrutura de permissões para uso interno (salvar no DB, etc.)
const FLATTENED_PERMISSIONS = Object.values(PERMISSIONS_STRUCTURE)
  .flatMap(env => Object.values(env))
  .flatMap(module => module);

const AccessProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<Profile["target"]>("admin");
  const [status, setStatus] = useState<Profile["status"]>("active");
  const [permState, setPermState] = useState<Record<string, boolean>>({});

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("role_profiles")
        .select("id,name,target,permissions,status")
        .order("name", { ascending: true });
      if (error) return;
      if (mounted) setProfiles((data as Profile[]) ?? []);
    })();
    return () => { mounted = false; };
  }, []);

  const sorted = useMemo(() => [...profiles], [profiles]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setTarget("admin");
    setStatus("active");
    setPermState({});
    setOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditing(p);
    setName(p.name);
    setTarget(p.target);
    setStatus(p.status);
    const map: Record<string, boolean> = {};
    (p.permissions ?? []).forEach((k) => (map[k] = true));
    setPermState(map);
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome do perfil.");
      return;
    }
    const selectedPerms = FLATTENED_PERMISSIONS.filter((p) => permState[p.key]).map((p) => p.key);
    const { data, error } = await supabase
      .from("role_profiles")
      .upsert({
        id: editing?.id,
        name: name.trim(),
        target,
        permissions: selectedPerms,
        status,
      } as any)
      .select("id,name,target,permissions,status")
      .single();
    if (error) {
      showError("Não foi possível salvar o perfil.");
      return;
    }
    const saved = data as Profile;
    setProfiles((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });
    setOpen(false);
    showSuccess(editing ? "Perfil atualizado." : "Perfil criado.");
  };

  const onDelete = (p: Profile) => {
    setDeleteTarget(p);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("role_profiles").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir perfil.");
      return;
    }
    setProfiles((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Perfil excluído.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Perfis e Regras de Acesso</div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Novo Perfil</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Perfil</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-brand-glow" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ambiente</label>
                <Select value={target} onValueChange={(v: Profile["target"]) => setTarget(v)}>
                  <SelectTrigger className="h-10 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-brand-glow">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administração</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(v: Profile["status"]) => setStatus(v)}>
                  <SelectTrigger className="h-10 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-brand-glow">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <div className="text-sm font-medium">Permissões</div>
              <Card className="p-3 max-h-[60vh] overflow-y-auto">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(PERMISSIONS_STRUCTURE).map(([envKey, modules]) => (
                    <AccordionItem key={envKey} value={envKey}>
                      <AccordionTrigger className="text-base font-semibold capitalize">
                        {envKey === "admin" ? "Ambiente de Administração" : "Ambiente do Parceiro"}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 py-2">
                          {Object.entries(modules).map(([moduleKey, functions]) => (
                            <Card key={moduleKey} className="p-3">
                              <div className="mb-2 text-sm font-medium capitalize">{moduleKey.replace(/([A-Z])/g, ' $1').trim()}</div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {functions.map((p) => (
                                  <label key={p.key} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={!!permState[p.key]}
                                      onCheckedChange={(v) => setPermState((s) => ({ ...s, [p.key]: !!v }))}
                                    />
                                    {p.label}
                                  </label>
                                ))}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
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
              <TableHead className="text-white first:rounded-tl-xl">Perfil</TableHead>
              <TableHead className="text-white">Ambiente</TableHead>
              <TableHead className="text-white">Permissões</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.target === "admin" ? "Administração" : "Parceiro"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{(p.permissions ?? []).join(", ") || "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${p.status === "active" ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
                    {p.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(p)}>Excluir</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum perfil cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "selecionado"}</span>?
              Esta ação não poderá ser desfeita e pode afetar usuários associados a este perfil.
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

export default AccessProfiles;