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
import { supabase } from "@/integrations/supabase/client";
import { userManagementService } from "@/services/userManagement";
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
// Removed password field and related icons
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Partner = {
  id: string;
  name: string;
  theme?: { primary?: string; secondary?: string };
  responsible_name?: string;
  responsible_email?: string;
  responsible_phone?: string;
  status?: "pending" | "active" | "suspended" | "inactive";
};

type Plan = {
  id: string;
  name: string;
  limits?: { active_assessments?: number };
  status?: "active" | "inactive";
};
type PlanAssignment = {
  id: string;
  partner_id: string;
  plan_id: string;
};
type Company = { id: string; name: string; partner_id: string };
type UsageCounter = {
  id: string;
  partner_id: string;
  companies_count?: number;
  active_employees_count?: number;
  active_assessments_count?: number;
};

function formatPhoneBR(input: string) {
  const digits = (input || "").replace(/\D/g, "").slice(0, 11);
  const d = digits.split("");
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${digits}`;
  if (d.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (d.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Fallback: derive first/last name from email local-part (e.g., "maria.silva")
function deriveNameFromEmail(email?: string | null) {
  const raw = (email || '').split('@')[0];
  if (!raw) return { first: '', last: '' };
  const cleaned = raw.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { first: '', last: '' };
  const parts = cleaned.split(' ');
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const first = cap(parts.shift() || '');
  const last = parts.map(cap).join(' ');
  return { first, last };
}

const Partners = () => {
  const { session } = useSession(); // Use the reactive session
  const [partners, setPartners] = useState<Partner[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [usage, setUsage] = useState<UsageCounter[]>([]);
  const [linkedNamesByPartner, setLinkedNamesByPartner] = useState<Record<string, string>>({});

  // Nome e sobrenome do usuário logado (com fallback derivado do e-mail)
  const derivedFromEmail = useMemo(() => deriveNameFromEmail(session?.user?.email || ''), [session?.user?.email]);
  const userFirstName = session?.profile.first_name || derivedFromEmail.first;
  const userLastName = session?.profile.last_name || derivedFromEmail.last;

  // Modal cadastro/edição
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Confirmação de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

  // Confirmação de suspensão
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Partner | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [responsibleFirstName, setResponsibleFirstName] = useState("");
  const [responsibleLastName, setResponsibleLastName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  // Removed password state
  const [status, setStatus] = useState<"pending" | "active" | "suspended" | "inactive">("active");
  const [isSaving, setIsSaving] = useState(false);
  const [hasLinkedUser, setHasLinkedUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: parts, error: e1 }, { data: pls, error: e2 }, { data: assigns, error: e3 }, { data: comps, error: e4 }, { data: usec, error: e5 }] =
        await Promise.all([
          supabase.from("partners").select("*").order("created_at", { ascending: false }),
          supabase.from("plans").select("*").order("name", { ascending: true }),
          supabase.from("plan_assignments").select("*"),
          supabase.from("companies").select("id,name,partner_id"),
          supabase.from("usage_counters").select("*"),
        ]);
      if (e1 || e2 || e3 || e4 || e5) {
        console.error("Error loading partners admin data", e1 || e2 || e3 || e4 || e5);
        showError("Falha ao carregar dados dos parceiros.");
      }
      if (!mounted) return;
      setPartners((parts as Partner[]) ?? []);
      setPlans((pls as Plan[]) ?? []);
      setAssignments((assigns as PlanAssignment[]) ?? []);
      setCompanies((comps as Company[]) ?? []);
      setUsage((usec as UsageCounter[] ?? []));
      // Limpa cache de nomes vinculados até sincronizar novamente
      setLinkedNamesByPartner({});
    })();
    return () => { mounted = false; };
  }, []);

  // Sincroniza nomes vinculados para a listagem (sem abrir modal)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = partners.map(p => p.id);
      if (ids.length === 0) return;
      try {
        const { data: members, error: mErr } = await supabase
          .from('partner_members')
          .select('partner_id,user_id')
          .in('partner_id', ids);
        if (mErr || !members || members.length === 0) return;
        const userIds = [...new Set(members.map(m => m.user_id).filter(Boolean))] as string[];
        if (userIds.length === 0) return;
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id,first_name,last_name')
          .in('id', userIds);
        if (pErr || !profs) return;
        const nameByUser: Record<string, string> = {};
        for (const pr of profs as any[]) {
          const fn = (pr.first_name || '').trim();
          const ln = (pr.last_name || '').trim();
          nameByUser[pr.id] = [fn, ln].filter(Boolean).join(' ');
        }
        const map: Record<string, string> = {};
        for (const m of members as any[]) {
          const n = nameByUser[m.user_id];
          if (n) map[m.partner_id] = n;
        }
        if (!cancelled) setLinkedNamesByPartner(map);
      } catch (err) {
        console.warn('[Partners] Falha ao sincronizar nomes para listagem:', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners.map(p => p.id).join(',')]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: parts, error: e1 }, { data: pls, error: e2 }, { data: assigns, error: e3 }, { data: comps, error: e4 }, { data: usec, error: e5 }] =
        await Promise.all([
          supabase.from("partners").select("*").order("created_at", { ascending: false }),
          supabase.from("plans").select("*").order("name", { ascending: true }),
          supabase.from("plan_assignments").select("*"),
          supabase.from("companies").select("id,name,partner_id"),
          supabase.from("usage_counters").select("*"),
        ]);
      if (e1 || e2 || e3 || e4 || e5) {
        console.error("Error loading partners admin data", e1 || e2 || e3 || e4 || e5);
        showError("Falha ao carregar dados dos parceiros.");
      }
      if (!mounted) return;
      setPartners((parts as Partner[]) ?? []);
      setPlans((pls as Plan[]) ?? []);
      setAssignments((assigns as PlanAssignment[]) ?? []);
      setCompanies((comps as Company[]) ?? []);
      setUsage((usec as UsageCounter[] ?? []));
    })();
    return () => { mounted = false; };
  }, [session?.user?.id]); // Depend on session.user.id to re-fetch data if user changes

  const companiesPerPartner = useMemo(() => {
    const map: Record<string, number> = {};
    companies.forEach((c) => {
      map[c.partner_id] = (map[c.partner_id] ?? 0) + 1;
    });
    return map;
  }, [companies]);

  const planByPartnerId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    assignments.forEach((a) => {
      map[a.partner_id] = a.plan_id;
    });
    return map;
  }, [assignments]);

  const limitsByPartnerId = useMemo(() => {
    const map: Record<string, Plan["limits"] | undefined> = {};
    assignments.forEach((a) => {
      const pl = plans.find((p) => p.id === a.plan_id);
      map[a.partner_id] = pl?.limits;
    });
    return map;
  }, [assignments, plans]);

  const usageByPartnerId = useMemo(() => {
    const map: Record<string, UsageCounter | undefined> = {};
    usage.forEach((u) => {
      map[u.partner_id] = u;
    });
    return map;
  }, [usage]);

  const activePlans = useMemo(
    () => plans.filter((p) => (p.status ?? "active") === "active"),
    [plans],
  );

  const remainingAssessments = (partner_id: string) => {
    const lim = limitsByPartnerId[partner_id];
    const use = usageByPartnerId[partner_id];
    const limit = lim?.active_assessments ?? 0;
    const used = use?.active_assessments_count ?? 0;
    if (!limit || limit === 0) return "—";
    return Math.max(limit - used, 0);
  };

  const resetForm = () => {
    setName("");
    setPlanId(undefined);
    setResponsibleFirstName("");
    setResponsibleLastName("");
    setResponsibleEmail("");
    setResponsiblePhone("");
    setStatus("active");
    setEditingId(undefined);
    setIsEditing(false);
    // Removed password visibility reset
  };

  const openCreate = () => {
    resetForm();
    setHasLinkedUser(false);
    setOpen(true);
  };

  const openEdit = (p: Partner) => {
    setIsEditing(true);
    setEditingId(p.id);
    setName(p.name ?? "");
    // Best-effort split of existing responsible_name into first/last
    const full = (p.responsible_name ?? "").trim();
    if (full) {
      const parts = full.split(/\s+/);
      setResponsibleFirstName(parts.shift() || "");
      setResponsibleLastName(parts.join(" "));
    } else {
      setResponsibleFirstName("");
      setResponsibleLastName("");
      // Fallback: use Edge Function (service role) to fetch first/last name
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('admin-partners', {
            body: { action: 'get_responsible_name', partner_id: p.id },
          });
          if (!error && (data as any)?.ok) {
            const fn = (data as any)?.first_name || '';
            const ln = (data as any)?.last_name || '';
            if (fn || ln) {
              setResponsibleFirstName(fn);
              setResponsibleLastName(ln);
              return;
            }
          }
          // Second fallback: derive from email if function returns nothing
          if (!p.responsible_name && p.responsible_email) {
            const derived = deriveNameFromEmail(p.responsible_email);
            setResponsibleFirstName(derived.first);
            setResponsibleLastName(derived.last);
          }
        } catch (e) {
          console.warn('[Partners] openEdit get_responsible_name failed:', e);
          // Final fallback on error: try deriving from email
          if (!p.responsible_name && p.responsible_email) {
            const derived = deriveNameFromEmail(p.responsible_email);
            setResponsibleFirstName(derived.first);
            setResponsibleLastName(derived.last);
          }
        }
      })();
    }
    setResponsibleEmail(p.responsible_email ?? "");
    setResponsiblePhone(p.responsible_phone ?? "");
    setStatus(p.status ?? "active");
    setPlanId(planByPartnerId[p.id]);
    (async () => {
      type MemberRow = { user_id: string | null } | null;
      type ProfileRow = { first_name: string | null; last_name: string | null } | null;
      try {
        const { data: memberRow, error } = await supabase
          .from("partner_members")
          .select("user_id")
          .eq("partner_id", p.id)
          .maybeSingle<MemberRow>();
        if (!error && memberRow && memberRow.user_id) {
          setHasLinkedUser(true);
          // 1) Tenta obter nome/sobrenome via Edge Function (tem privilégios para ler auth.users/profiles com segurança)
          try {
            const { data: fnData, error: fnErr } = await supabase.functions.invoke('admin-partners', {
              body: { action: 'get_responsible_name', partner_id: p.id },
            });
            const firstViaFn = (fnData as any)?.first_name as string | undefined;
            const lastViaFn = (fnData as any)?.last_name as string | undefined;
            if (!fnErr && (firstViaFn || lastViaFn)) {
              const fn = (firstViaFn || '').trim();
              const ln = (lastViaFn || '').trim();
              setResponsibleFirstName(fn);
              setResponsibleLastName(ln);
              const fullName = `${fn} ${ln}`.trim();
              // Atualiza apenas o estado local (linkedNamesByPartner já cuida da exibição)
              setLinkedNamesByPartner((prev) => ({ ...prev, [p.id]: fullName }));
              return; // sucesso via função, não precisa fallback
            }
          } catch (fnCallErr) {
            console.warn('[Partners] get_responsible_name function fallback to direct query:', fnCallErr);
          }

          // 2) Fallback: busca nome do perfil e sincroniza automaticamente no parceiro
          try {
            const { data: prof, error: profErr } = await supabase
              .from("profiles")
              .select("first_name,last_name")
              .eq("id", memberRow.user_id)
              .maybeSingle<ProfileRow>();
            if (!profErr && prof) {
              const fn = (prof.first_name || '').trim();
              const ln = (prof.last_name || '').trim();
              if (fn || ln) {
                setResponsibleFirstName(fn);
                setResponsibleLastName(ln);
                const fullName = `${fn} ${ln}`.trim();
                // Atualiza apenas o estado local (linkedNamesByPartner já cuida da exibição)
                setLinkedNamesByPartner((prev) => ({ ...prev, [p.id]: fullName }));
              }
            }
          } catch (innerErr) {
            console.warn('[Partners] Erro ao buscar perfil para sincronização:', innerErr);
          }
        } else {
          setHasLinkedUser(false);
          // Sem vínculo em partner_members: tenta resolver pelo e-mail do responsável via Edge Function
          const email = (p.responsible_email || '').trim().toLowerCase();
          if (email) {
            try {
              const { data: fnData, error: fnErr } = await supabase.functions.invoke('admin-partners', {
                body: { action: 'get_name_by_email', email },
              });
              const firstViaFn = (fnData as any)?.first_name as string | undefined;
              const lastViaFn = (fnData as any)?.last_name as string | undefined;
              if (!fnErr && (firstViaFn || lastViaFn)) {
                const fn = (firstViaFn || '').trim();
                const ln = (lastViaFn || '').trim();
                setResponsibleFirstName(fn);
                setResponsibleLastName(ln);
                const fullName = `${fn} ${ln}`.trim();
                // Atualiza apenas o estado local (linkedNamesByPartner já cuida da exibição)
                setLinkedNamesByPartner((prev) => ({ ...prev, [p.id]: fullName }));
              }
            } catch (emailFnErr) {
              console.warn('[Partners] get_name_by_email falhou:', emailFnErr);
            }
          }
        }
      } catch {
        setHasLinkedUser(false);
      }
    })();
    setOpen(true);
  };

  const handleCreatePartner = async () => {
    setIsSaving(true);
    if (!responsibleFirstName.trim() || !responsibleLastName.trim()) {
      showError("Informe Nome e Sobrenome do responsável.");
      setIsSaving(false);
      return;
    }

    const partnerPayload = {
      name: name.trim(),
      responsibleName: `${responsibleFirstName.trim()} ${responsibleLastName.trim()}`.trim(),
      responsibleFirstName: responsibleFirstName.trim(),
      responsibleLastName: responsibleLastName.trim(),
      responsibleEmail: responsibleEmail.trim().toLowerCase(),
      responsiblePhone: responsiblePhone.trim(),
      status,
    };

    try {
      const { data, error } = await supabase.functions.invoke("create-partner", {
        body: { partner: partnerPayload, planId },
      });

      if (error) {
        console.error("Function error:", error);
        showError(data?.error || "Falha ao criar parceiro (erro na função).");
        setIsSaving(false);
        return;
      }

      const { partner: newPartner, assignment: newAssignment } = data;

      setPartners((prev) => [newPartner, ...prev]);
      setAssignments((prev) => [...prev, newAssignment]);

      if (session?.user?.id) {
        await (supabase as any).from("audit_logs").insert({
          user_id: session.user.id,
          partner_id: newPartner.id,
          action: "Criou Parceiro",
          entity: "Parceiro",
          payload_json: { partner_id: newPartner.id, partner_name: newPartner.name },
        });
      }

      showSuccess("Parceiro criado com sucesso. Um e-mail de convite foi enviado ao responsável.");
      
    } catch (err) {
      console.error("Unexpected error:", err);
      showError("Falha inesperada ao criar parceiro.");
    } finally {
      setIsSaving(false);
      setOpen(false);
      resetForm();
    }
  };

  const handleUpdatePartner = async () => {
    setIsSaving(true);
    const partnerPayload = {
      id: editingId,
      name: name.trim(),
      responsible_email: responsibleEmail.trim().toLowerCase() || undefined,
      responsible_phone: responsiblePhone.trim() || undefined,
      status,
    };

    try {
      const { data: savedPartners, error: pErr } = await (supabase as any).from("partners").upsert(partnerPayload).select("*");
      if (pErr) {
        console.error("Partner update error:", pErr);
        showError("Falha ao salvar parceiro: " + pErr.message);
        setIsSaving(false);
        return;
      }
      if (!savedPartners || savedPartners.length === 0) {
        showError("Falha ao salvar parceiro: nenhum dado retornado.");
        setIsSaving(false);
        return;
      }
      const savedPartner = savedPartners[0] as Partner;

      setPartners((prev) => prev.map((p) => (p.id === savedPartner.id ? savedPartner : p)));

      const current = assignments.find((a) => a.partner_id === savedPartner.id);
      const assignPayload: Partial<PlanAssignment> = { id: current?.id, partner_id: savedPartner.id, plan_id: planId! };
      const { data: savedAssigns, error: aErr } = await (supabase as any).from("plan_assignments").upsert(assignPayload).select("*");

      if (aErr) {
        console.error("Assignment update error:", aErr);
        showError("Parceiro salvo, mas falha ao atualizar plano: " + aErr.message);
      } else if (!savedAssigns || savedAssigns.length === 0) {
        showError("Parceiro salvo, mas falha ao atualizar plano: nenhum dado retornado.");
      } else {
        const savedAssign = savedAssigns[0] as PlanAssignment;
        setAssignments((prev) => {
          const without = prev.filter((a) => a.partner_id !== savedAssign.partner_id);
          return [...without, savedAssign];
        });
      }

      if (session?.user?.id) {
        await (supabase as any).from("audit_logs").insert({
          user_id: session.user.id,
          partner_id: savedPartner.id,
          action: "Atualizou Parceiro",
          entity: "Parceiro",
          payload_json: { partner_id: savedPartner.id, partner_name: savedPartner.name },
        });
      }

      // Sincroniza Nome/Sobrenome do responsável no perfil do usuário (public.profiles)
      try {
        const { data: memberRow, error: memberErr } = await supabase
          .from("partner_members")
          .select("user_id")
          .eq("partner_id", savedPartner.id)
          .maybeSingle();
        if (memberErr) {
          console.warn("[Partners] Falha ao obter partner_members:", memberErr.message);
        }
        const userId = memberRow?.user_id as string | undefined;
        if (userId) {
          await userManagementService.updateUser({
            userId,
            firstName: (responsibleFirstName || "").trim() || undefined,
            lastName: (responsibleLastName || "").trim() || undefined,
          });
        }
      } catch (syncErr) {
        console.warn("[Partners] Não foi possível sincronizar nome do usuário responsável:", syncErr);
      }

      showSuccess("Parceiro atualizado.");
    } catch (err) {
      console.error("Unexpected error:", err);
      showError("Falha inesperada ao atualizar parceiro.");
    } finally {
      setIsSaving(false);
      setOpen(false);
      resetForm();
    }
  };

  const onSave = () => {
    if (!name.trim() || !responsibleFirstName.trim() || !responsibleLastName.trim() || !planId) {
      showError("Preencha Nome da Empresa, Nome, Sobrenome e Plano.");
      return;
    }
    if (isEditing) {
      handleUpdatePartner();
    } else {
      handleCreatePartner();
    }
  };

  const onDelete = (partner: Partner) => {
    setDeleteTarget(partner);
    setDeleteOpen(true);
  };

  // Ativação manual removida no MVP

  const suspendPartner = async (partner: Partner) => {
    setIsSuspending(true);
    try {
      // Atualiza diretamente no banco via Supabase client (não depende de Edge Function)
      const { error: updateErr } = await (supabase as any)
        .from('partners')
        .update({ status: 'suspended' })
        .eq('id', partner.id);
      
      if (updateErr) {
        throw new Error(`Falha ao suspender parceiro: ${updateErr.message}`);
      }

      setPartners((prev) => prev.map((p) => (p.id === partner.id ? { ...p, status: 'suspended' } : p)));

      if (session?.user?.id) {
        await (supabase as any).from('audit_logs').insert({
          user_id: session.user.id,
          partner_id: partner.id,
          action: 'Suspendeu Parceiro',
          entity: 'Parceiro',
          payload_json: { partner_id: partner.id, partner_name: partner.name },
        });
      }

      showSuccess('Parceiro suspenso e e-mail enviado.');
      setSuspendOpen(false);
      setSuspendTarget(null);
    } catch (e: any) {
      console.error('[Partners] suspend error:', e);
      const msg = typeof e?.message === 'string' ? e.message : 'Falha ao suspender parceiro.';
      showError(msg.includes('Failed to send a request')
        ? 'Falha ao contatar a Edge Function. Verifique URL do projeto e conexão.'
        : msg);
    } finally {
      setIsSuspending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const partner_id = deleteTarget.id;

    try {
      const { error: pErr } = await supabase.from("partners").delete().eq("id", partner_id);
      if (pErr) {
        console.error("Partner delete error:", pErr);
        showError("Falha ao excluir parceiro: " + pErr.message);
        return;
      }
      setPartners((prev) => prev.filter((p) => p.id !== partner_id));

      const { error: assignErr } = await supabase.from("plan_assignments").delete().eq("partner_id", partner_id);
      if (assignErr) {
        console.warn("Failed to delete plan_assignments for partner:", assignErr);
      }
      setAssignments((prev) => prev.filter((a) => a.partner_id !== partner_id));

      if (session?.user?.id) {
        await (supabase as any).from("audit_logs").insert({
          user_id: session.user.id,
          partner_id: partner_id,
          action: "Excluiu Parceiro",
          entity: "Parceiro",
          payload_json: { partner_id: partner_id, partner_name: deleteTarget.name },
        });
      }

      showSuccess("Parceiro excluído.");
    } catch (err) {
      console.error("Unexpected error:", err);
      showError("Falha inesperada ao excluir parceiro.");
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Parceiros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os parceiros, pacotes e contatos responsáveis.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Usuário: {userFirstName} {userLastName}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              try {
                // Busca configurações de e-mail da tabela platform_settings
                const { data: platformSettings } = await (supabase as any)
                  .from('platform_settings')
                  .select('email_theme_primary, email_theme_secondary, email_logo_url, platform_name')
                  .limit(1)
                  .maybeSingle();
                
                const testPartner = partners[0];
                
                const { data, error } = await supabase.functions.invoke('send-email', {
                  body: {
                    action: 'send_welcome',
                    recipient_email: session?.user?.email || 'teste@example.com',
                    data: {
                      first_name: userFirstName,
                      partner_name: testPartner?.name || 'Teste',
                      platform_name: platformSettings?.platform_name || 'Valida NR1',
                      activation_link: `${window.location.origin}/partner/ativacao`,
                      temp_password: 'teste123',
                      recipient_email: session?.user?.email || 'teste@example.com',
                      theme_primary: platformSettings?.email_theme_primary || '#667eea',
                      theme_secondary: platformSettings?.email_theme_secondary || '#764ba2',
                      logo_url: platformSettings?.email_logo_url || ''
                    }
                  }
                });
                if (error) throw error;
                showSuccess('E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.');
              } catch (err: any) {
                showError('Erro ao enviar e-mail: ' + err.message);
              }
            }}
            variant="outline"
            className="whitespace-nowrap"
          >
            📧 Testar E-mail
          </Button>
          
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="whitespace-nowrap">+ Novo Parceiro</Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="nome" className="text-sm font-medium">Nome</label>
                  <Input
                    id="nome"
                    placeholder="Ex.: Maria"
                    value={responsibleFirstName}
                    onChange={(e) => setResponsibleFirstName(e.target.value)}
                    disabled={hasLinkedUser}
                    className="h-10 rounded-xl focus-brand-glow"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sobrenome" className="text-sm font-medium">Sobrenome</label>
                  <Input
                    id="sobrenome"
                    placeholder="Ex.: Silva"
                    value={responsibleLastName}
                    onChange={(e) => setResponsibleLastName(e.target.value)}
                    disabled={hasLinkedUser}
                    className="h-10 rounded-xl focus-brand-glow"
                  />
                </div>
              </div>
              {hasLinkedUser && (
                <div className="text-xs text-muted-foreground">
                  Nome e sobrenome são sincronizados com o usuário vinculado. Edite em Administração &rarr; Usuários.
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="empresa" className="text-sm font-medium">Nome da Empresa</label>
                <Input
                  id="empresa"
                  placeholder="Ex.: Consultoria Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl focus-brand-glow"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@empresa.com"
                    value={responsibleEmail}
                    onChange={(e) => setResponsibleEmail(e.target.value)}
                    className="h-10 rounded-xl focus-brand-glow"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="telefone" className="text-sm font-medium">Telefone/WhatsApp</label>
                  <Input
                    id="telefone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 98765-4321"
                    value={responsiblePhone}
                    onChange={(e) => setResponsiblePhone(formatPhoneBR(e.target.value))}
                    maxLength={16}
                    className="h-10 rounded-xl focus-brand-glow"
                  />
                </div>
              </div>

              {/* Campo de senha removido */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Seleção do Plano/Pacote</div>
                  <Select value={planId} onValueChange={setPlanId}>
                    <SelectTrigger className="h-10 rounded-xl focus-brand-glow">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Status do Parceiro</div>
                  <Select value={status} onValueChange={(v: "active" | "inactive" | "suspended" | "pending") => setStatus(v)}>
                    <SelectTrigger className="h-10 rounded-xl focus-brand-glow">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Nome da Empresa</TableHead>
                <TableHead className="text-white">Pacote</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-center text-white">Avaliações Restantes</TableHead>
                <TableHead className="text-white">Usuário</TableHead>
                <TableHead className="text-white">Telefone</TableHead>
                <TableHead className="text-right text-white last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => {
                const currentPlanId = planByPartnerId[p.id];
                const planName = plans.find((pl) => pl.id === currentPlanId)?.name ?? "—";
                const st = (p.status as Partner["status"]) ?? "active";
                const remaining = remainingAssessments(p.id);
                const statusClasses = (() => {
                  if (st === 'pending') return "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-amber-100 border-amber-200 text-amber-800";
                  if (st === 'suspended' || st === 'inactive') return "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-red-100 border-red-200 text-red-700";
                  return "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-emerald-100 border-emerald-200 text-emerald-700";
                })();

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {companiesPerPartner[p.id] ?? 0} empresas
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{planName}</TableCell>
                    <TableCell>
                      <span className={statusClasses}>
                        {st === 'pending' ? 'Pendente' : st === 'suspended' ? 'Suspenso' : st === 'inactive' ? 'Inativo' : 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {typeof remaining === "number" ? remaining : remaining}
                    </TableCell>
                    <TableCell className="truncate max-w-[220px]">
                      {(() => {
                        const linkedName = linkedNamesByPartner[p.id];
                        const derived = deriveNameFromEmail(p.responsible_email);
                        const displayName = (linkedName && linkedName.trim())
                          || (p.responsible_name?.trim())
                          || [derived.first, derived.last].filter(Boolean).join(' ')
                          || '—';
                        return (
                          <div className="space-y-0.5">
                            <div className="font-medium leading-tight">{displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.responsible_email ?? '—'}</div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{p.responsible_phone ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {/* Suspender parceiro */}
                      {st === 'active' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setSuspendTarget(p); setSuspendOpen(true); }}
                          disabled={isSuspending && suspendTarget?.id === p.id}
                        >
                          {isSuspending && suspendTarget?.id === p.id ? 'Suspendendo...' : 'Suspender'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(p)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum parceiro cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir parceiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "este parceiro"}</span>?
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

      {/* Modal de confirmação de suspensão */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender parceiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja suspender
              {" "}
              <span className="font-medium text-foreground">{suspendTarget?.name ?? 'este parceiro'}</span>?
              {" "}
              O acesso do parceiro será bloqueado até reativação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSuspending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => suspendTarget && suspendPartner(suspendTarget)}
              disabled={isSuspending}
            >
              {isSuspending ? 'Suspendendo...' : 'Confirmar suspensão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Partners;