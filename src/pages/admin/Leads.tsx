import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";

interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone_whatsapp: string | null;
  company: string | null;
  status: string;
  created_at: string;
  plan_id: string | null;
  plan_name: string | null;
}

const Leads = () => {
  const { session } = useSession();
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [converting, setConverting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [edit, setEdit] = useState<{ id?: string; name: string; email: string; phone: string; company: string; status: string; plan_id?: string | null }>({ name: "", email: "", phone: "", company: "", status: "new", plan_id: undefined });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const normalizePhone = (v: string) => (v || "").replace(/\D/g, "");
  const isValidEmail = (v: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v.trim());
  const isValidPhone = (v: string) => {
    const d = normalizePhone(v);
    return d.length === 10 || d.length === 11;
  };

  const statusPtBr = (value: string) => {
    const v = (value || '').toLowerCase();
    if (v === 'new') return 'Novo';
    if (v === 'contacted') return 'Contactado';
    if (v === 'awaiting_payment') return 'Aguardando pagamento';
    if (v === 'approved') return 'Aprovado';
    if (v === 'rejected') return 'Rejeitado';
    return value;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error("Sem sessão válida");
        const url = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads?limit=50`;
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) throw new Error(`Erro ${resp.status}`);
        const json = await resp.json();
        if (mounted) setItems(json.items || []);
      } catch (e: any) {
        console.error("[Admin Leads] erro:", e);
        if (mounted) setError("Falha ao carregar leads.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };

  }, [session?.user?.id]);

  const saveEdit = async () => {
    if (!edit.id) return;
    if (!edit.name.trim()) { showError("Informe o nome."); return; }
    if (!isValidEmail(edit.email)) { showError("E-mail inválido."); return; }
    if (edit.phone && !isValidPhone(edit.phone)) { showError("WhatsApp inválido."); return; }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sem sessão válida");
      const url = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update_lead",
          lead_id: edit.id,
          name: edit.name.trim(),
          email: edit.email.trim(),
          phone_whatsapp: normalizePhone(edit.phone),
          company: edit.company.trim() || null,
          status: edit.status,
          plan_id: edit.plan_id || null,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || `Erro ${resp.status}`);
      showSuccess("Lead atualizado.");
      setEditOpen(false);
      await refresh();
    } catch (e: any) {
      console.error("[Admin Leads] erro update lead:", e);
      showError(e?.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedLead) return;
    setDeleting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sem sessão válida");
      const url = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete_lead", lead_id: selectedLead.id }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) throw new Error(json?.error || `Erro ${resp.status}`);
      showSuccess("Lead excluído.");
      setDeleteOpen(false);
      await refresh();
    } catch (e: any) {
      console.error("[Admin Leads] erro delete lead:", e);
      showError(e?.message || "Falha ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  // Carregar planos para o modal
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,status");
      if (error) {
        console.error("[Admin Leads] erro ao carregar planos:", error);
        return;
      }
      if (mounted) {
        const actives = (data || []).filter((p: any) => (p.status || '').toLowerCase() === 'active');
        setPlans(actives.map((p: any) => ({ id: p.id, name: p.name })));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openConvertModal = (lead: LeadItem) => {
    setSelectedLead(lead);
    setPartnerName(lead.company || lead.name);
    setSelectedPlanId(lead.plan_id || plans[0]?.id);
    setModalOpen(true);
  };

  const openEditModal = (lead: LeadItem) => {
    setEdit({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone_whatsapp || "",
      company: lead.company || "",
      status: lead.status,
      plan_id: lead.plan_id,
    });
    setEditOpen(true);
  };

  const openDeleteConfirm = (lead: LeadItem) => {
    setSelectedLead(lead);
    setDeleteOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedLead(null);
    setPartnerName("");
    setSelectedPlanId(undefined);
  };

  const refresh = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads?limit=50`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) return;
      const json = await resp.json();
      setItems(json.items || []);
    } catch {}
  };

  const confirmConvert = async () => {
    if (!selectedLead) return;
    const name = partnerName.trim();
    if (!name) {
      showError("Informe o nome do parceiro.");
      return;
    }
    if (!selectedPlanId) {
      showError("Selecione um plano para o parceiro.");
      return;
    }
    setConverting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sem sessão válida");
      const url = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "convert",
          lead_id: selectedLead.id,
          partner_name: name,
          plan_id: selectedPlanId,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || `Erro ${resp.status}`);
      }
      showSuccess("Lead convertido em parceiro (pendente).");
      closeModal();
      await refresh();
    } catch (e: any) {
      console.error("[Admin Leads] erro converter lead:", e);
      showError(e?.message || "Falha ao converter lead.");
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoadingSpinner size={24} /> Carregando leads...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Leads</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Acompanhe os leads e converta em parceiros quando apropriado.</p>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#0E3A4D] text-white">
                <th className="py-3 px-4 text-left">Nome</th>
                <th className="py-3 px-4 text-left">E-mail</th>
                <th className="py-3 px-4 text-left">WhatsApp</th>
                <th className="py-3 px-4 text-left">Plano</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Quando</th>
                <th className="py-3 px-4 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="py-2 px-4">{it.name}</td>
                  <td className="py-2 px-4">{it.email}</td>
                  <td className="py-2 px-4">{it.phone_whatsapp || "-"}</td>
                  <td className="py-2 px-4">{it.plan_name || it.plan_id || "-"}</td>
                  <td className="py-2 px-4">{statusPtBr(it.status)}</td>
                  <td className="py-2 px-4">{new Date(it.created_at).toLocaleString()}</td>
                  <td className="py-2 px-4 space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => openConvertModal(it)}>Converter</Button>
                    <Button size="sm" onClick={() => openEditModal(it)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => openDeleteConfirm(it)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="py-4 px-4 text-muted-foreground" colSpan={7}>Nenhum lead encontrado.</td>
                </tr>
              )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg p-5">
            <h2 className="text-lg font-semibold mb-2">Editar Lead</h2>
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={edit.name} onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input value={edit.email} onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">WhatsApp</label>
                <Input value={edit.phone} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} placeholder="(11) 91234-5678" />
              </div>
              <div>
                <label className="text-sm font-medium">Empresa</label>
                <Input value={edit.company} onChange={(e) => setEdit((s) => ({ ...s, company: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Plano</label>
                <Select value={edit.plan_id ?? undefined} onValueChange={(v) => setEdit((s) => ({ ...s, plan_id: v }))}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={edit.status} onValueChange={(v) => setEdit((s) => ({ ...s, status: v }))}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="awaiting_payment">Aguardando pagamento</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </Card>
        </div>
      )}

      {deleteOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md p-5">
            <h2 className="text-lg font-semibold mb-2">Excluir Lead</h2>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir o lead "{selectedLead.name}"? Esta ação não pode ser desfeita.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir'}</Button>
            </div>
          </Card>
        </div>
      )}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg p-5">
            <h2 className="text-lg font-semibold mb-2">Converter Lead</h2>
            <p className="text-sm text-muted-foreground mb-4">Confirme os dados para criar o parceiro. O status ficará "pending".</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome do parceiro</label>
                <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Plano</label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">E-mail</div>
                  <div className="font-medium">{selectedLead.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">WhatsApp</div>
                  <div className="font-medium">{selectedLead.phone_whatsapp || '-'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={confirmConvert} disabled={converting}>{converting ? 'Convertendo...' : 'Confirmar'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Leads;
