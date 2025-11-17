import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyPlanTab from "@/components/partner/settings/MyPlanTab";
import Membros from "@/pages/partner/Membros";
import ActionPlans from "@/pages/partner/ActionPlans";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Partner = {
  id: string;
  name: string;
  responsible_name?: string;
  responsible_email?: string;
  responsible_phone?: string;
  logo_data_url?: string;
  // New white label fields
  platform_name?: string;
  description?: string;
  logo_negative_data_url?: string;
  support_whatsapp?: string;
};

// Função de formatação de telefone (reutilizada de Admin/Settings.tsx)
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

const Configuracoes = () => {
  const { session } = useSession();
  // Usar chave unificada para compatibilidade
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const [partner, setPartner] = useState<Partner | null>(null);
  
  // Technical Responsibles state
  type TechnicalResponsible = {
    id?: string;
    partner_id: string;
    company_id: string | null;
    is_primary: boolean;
    name: string;
    council?: string | null;
    registration?: string | null;
    profession?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
  type CompanyOpt = { id: string; name: string };
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [trs, setTrs] = useState<TechnicalResponsible[]>([]);
  const [editing, setEditing] = useState<TechnicalResponsible | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all"); // 'all' | 'partner' | specific company id
  const [trModalOpen, setTrModalOpen] = useState<boolean>(false);

  // Existing fields for "Dados da Empresa" (now "White Label")
  const [name, setName] = useState("");
  const [respName, setRespName] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [respPhone, setRespPhone] = useState("");
  const [logoPrimaryPreview, setLogoPrimaryPreview] = useState<string | undefined>(undefined);

  // New fields for White Label
  const [platformName, setPlatformName] = useState("");
  const [description, setDescription] = useState("");
  const [logoNegativePreview, setLogoNegativePreview] = useState<string | undefined>(undefined);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  useEffect(() => {
    if (!partnerId) {
      console.log("No partner ID found in session:", { session });
      setPartner(null);
      setName("");
      setRespName("");
      setRespEmail("");
      setRespPhone("");
      setLogoPrimaryPreview(undefined);
      setPlatformName("");
      setDescription("");
      setLogoNegativePreview(undefined);
      setSupportWhatsapp("");
      return;
    }
    let mounted = true;
    (async () => {
      console.log("Fetching partner data for ID:", partnerId);
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .maybeSingle();
      if (error) {
        console.error("Error fetching partner config:", error);
        return;
      }
      if (mounted) {
        console.log("Partner data loaded:", data);
        const p = data as Partner | null;
        setPartner(p);
        setName(p?.name ?? "");
        setRespName(p?.responsible_name ?? "");
        setRespEmail(p?.responsible_email ?? "");
        setRespPhone(p?.responsible_phone ?? "");
        setLogoPrimaryPreview(p?.logo_data_url);
        // Set new white label fields
        setPlatformName(p?.platform_name ?? "");
        setDescription(p?.description ?? "");
        setLogoNegativePreview(p?.logo_negative_data_url);
        setSupportWhatsapp(p?.support_whatsapp ?? "");
      }
    })();
    // Load companies for selector
    (async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id,name')
        .eq('partner_id', partnerId)
        .order('name');
      if (error) {
        console.warn('Failed to load companies for TR UI:', error);
        return;
      }
      if (mounted) setCompanies((data as any[])?.map(r => ({ id: r.id, name: r.name })) || []);
    })();
    // Load existing TRs
    (async () => { await loadTechnicalResponsibles(partnerId); })();
    return () => { mounted = false; };
  }, [partnerId]);

  const loadTechnicalResponsibles = async (pId: string) => {
    const { data, error } = await supabase
      .from('technical_responsibles')
      .select('id,partner_id,company_id,is_primary,name,council,registration,profession,contact_email,contact_phone')
      .eq('partner_id', pId)
      .order('company_id', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });
    if (error) {
      console.error('Failed to load technical responsibles:', error);
      return;
    }
    setTrs((data as any[]) as TechnicalResponsible[]);
  };

  const resetEditing = () => setEditing({
    partner_id: partnerId!,
    company_id: null,
    is_primary: false,
    name: '',
    council: '',
    registration: '',
    profession: '',
    contact_email: '',
    contact_phone: ''
  });

  useEffect(() => { if (partnerId) resetEditing(); }, [partnerId]);

  const saveTR = async () => {
    if (!partnerId || !editing) return;
    if (!editing.name?.trim()) { showError('Informe o nome do responsável técnico.'); return; }
    try {
      // If marking as primary, unset others in same scope first
      if (editing.is_primary) {
        const scopeFilter = editing.company_id ? { company_id: editing.company_id } : { company_id: null } as any;
        const { error: clrErr } = await (supabase as any)
          .from('technical_responsibles')
          .update({ is_primary: false })
          .eq('partner_id', partnerId)
          [editing.company_id ? 'eq' : 'is']('company_id', editing.company_id ?? null);
        if (clrErr) throw clrErr;
      }
      if (editing.id) {
        const { data, error } = await (supabase as any)
          .from('technical_responsibles')
          .update({
            company_id: editing.company_id,
            is_primary: editing.is_primary,
            name: editing.name?.trim(),
            council: editing.council || null,
            registration: editing.registration || null,
            profession: editing.profession || null,
            contact_email: editing.contact_email || null,
            contact_phone: editing.contact_phone || null,
          })
          .eq('id', editing.id)
          .eq('partner_id', partnerId)
          .select('*')
          .single();
        if (error) throw error;
        showSuccess('Responsável técnico atualizado.');
      } else {
        const { data, error } = await (supabase as any)
          .from('technical_responsibles')
          .insert({
            partner_id: partnerId,
            company_id: editing.company_id,
            is_primary: editing.is_primary,
            name: editing.name?.trim(),
            council: editing.council || null,
            registration: editing.registration || null,
            profession: editing.profession || null,
            contact_email: editing.contact_email || null,
            contact_phone: editing.contact_phone || null,
          })
          .select('*')
          .single();
        if (error) throw error;
        showSuccess('Responsável técnico criado.');
      }
      await loadTechnicalResponsibles(partnerId);
      resetEditing();
      setTrModalOpen(false);
    } catch (e: any) {
      console.error('Failed to save technical responsible:', e);
      showError(e?.message || 'Falha ao salvar responsável técnico.');
    }
  };

  const editTR = (tr: TechnicalResponsible) => { setEditing({ ...tr }); setTrModalOpen(true); };
  const deleteTR = async (tr: TechnicalResponsible) => {
    if (!tr.id) return;
    if (!confirm('Excluir este responsável técnico?')) return;
    const { error } = await supabase
      .from('technical_responsibles')
      .delete()
      .eq('id', tr.id)
      .eq('partner_id', partnerId!);
    if (error) { showError('Falha ao excluir.'); return; }
    showSuccess('Excluído.');
    await loadTechnicalResponsibles(partnerId!);
  };

  const setPrimary = async (tr: TechnicalResponsible) => {
    try {
      // Clear current primary in same scope
      await (supabase as any)
        .from('technical_responsibles')
        .update({ is_primary: false })
        .eq('partner_id', partnerId!)
        [tr.company_id ? 'eq' : 'is']('company_id', tr.company_id ?? null);
      // Set selected as primary
      const { error } = await (supabase as any)
        .from('technical_responsibles')
        .update({ is_primary: true })
        .eq('id', tr.id)
        .eq('partner_id', partnerId!);
      if (error) throw error;
      showSuccess('Definido como principal.');
      await loadTechnicalResponsibles(partnerId!);
    } catch (e: any) {
      console.error('Failed to set primary:', e);
      showError('Falha ao definir principal.');
    }
  };

  const onFileChange = (file: File, which: "primary" | "negative") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (which === "primary") {
        setLogoPrimaryPreview(dataUrl);
      } else {
        setLogoNegativePreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (which: "primary" | "negative") => {
    if (which === "primary") {
      setLogoPrimaryPreview(undefined);
    } else {
      setLogoNegativePreview(undefined);
    }
  };

  const onSaveWhiteLabel = async () => {
    if (!partnerId) return;
    const payload = {
      id: partnerId,
      name: name.trim() || null,
      logo_data_url: logoPrimaryPreview || null,
      // White label fields
      platform_name: platformName.trim() || null,
      description: description.trim() || null,
      logo_negative_data_url: logoNegativePreview || null,
      support_whatsapp: supportWhatsapp.trim() || null,
      updated_at: new Date().toISOString(),
    } as any;

    try {
      // Tenta UPDATE primeiro (mais comum com RLS permitindo update próprio)
      const { data: existing } = await supabase
        .from("partners")
        .select("id")
        .eq("id", partnerId)
        .maybeSingle();

      if (existing && existing.id) {
        const { data: upd, error: updErr } = await (supabase as any)
          .from("partners")
          .update(payload as any)
          .eq("id", partnerId)
          .select("*")
          .single();
        if (updErr) throw updErr;
        setPartner(upd as Partner);
        showSuccess("Configurações de White Label salvas.");
        return;
      }

      // Se não existir, tenta INSERT
      const { data: ins, error: insErr } = await (supabase as any)
        .from("partners")
        .insert(payload as any)
        .select("*")
        .single();
      if (insErr) throw insErr;
      setPartner(ins as Partner);
      showSuccess("Configurações de White Label salvas.");
    } catch (err: any) {
      console.error("Error saving partner white label config:", err);
      const msg = err?.message ? `Não foi possível salvar as configurações de White Label. Detalhes: ${err.message}` : "Não foi possível salvar as configurações de White Label.";
      showError(msg);
    }
  };

  // Debug info
  console.log("Configuracoes render:", { 
    partnerId, 
    sessionKeys: session ? Object.keys(session) : null,
    partner_id: (session as any)?.partner_id,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <Tabs defaultValue="white-label"> {/* Changed default value */}
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="white-label">White Label</TabsTrigger> {/* Renamed tab */}
          <TabsTrigger className="flex-1" value="meu-plano">Meu Plano</TabsTrigger>
          <TabsTrigger className="flex-1" value="planos-acao">Planos de Ação</TabsTrigger>
          <TabsTrigger className="flex-1" value="responsaveis">Responsáveis Técnicos</TabsTrigger>
          <TabsTrigger className="flex-1" value="membros">Membros</TabsTrigger>
          {false && <TabsTrigger value="suporte">Suporte</TabsTrigger>}
          {false && <TabsTrigger value="plano-acao">Plano de Ação</TabsTrigger>}
          {false && <TabsTrigger value="plano-acao-v2">Plano de Ação V2</TabsTrigger>}
          {false && <TabsTrigger value="config-automatica">Config. Automática</TabsTrigger>}
        </TabsList>

        <TabsContent value="white-label" className="pt-4"> {/* Renamed tab content */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informações do Parceiro</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Parceiro</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsável</label>
                <Input value={respName} onChange={(e) => setRespName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail do Responsável</label>
                <Input type="email" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone/WhatsApp</label>
                <Input value={respPhone} onChange={(e) => setRespPhone(formatPhoneBR(e.target.value))} className="h-10" />
              </div>
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-4">Customização da Plataforma (White Label)</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Logo primário */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Logo Primário</div>
                  <div className="text-xs text-muted-foreground">
                    Usado no ambiente do parceiro e na tela de login.
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    Tamanho recomendado: 400x400 pixels (máx. 2MB)
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-28 overflow-hidden rounded-md bg-muted grid place-items-center">
                    {logoPrimaryPreview ? (
                      <img src={logoPrimaryPreview} alt="Logo Primário" className="max-h-16 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem logo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      Enviar arquivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], "primary")}
                      />
                    </label>
                    {logoPrimaryPreview ? (
                      <Button variant="destructive" size="sm" onClick={() => removeLogo("primary")}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Logo negativo */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Logo Negativo</div>
                  <div className="text-xs text-muted-foreground">
                    Usado em fundos escuros (ex: sidebar do admin).
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    Tamanho recomendado: 400x400 pixels (máx. 2MB)
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-28 overflow-hidden rounded-md bg-muted grid place-items-center">
                    {logoNegativePreview ? (
                      <img src={logoNegativePreview} alt="Logo Negativo" className="max-h-16 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem logo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      Enviar arquivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], "negative")}
                      />
                    </label>
                    {logoNegativePreview ? (
                      <Button variant="destructive" size="sm" onClick={() => removeLogo("negative")}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Plataforma</label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp de Suporte</label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(formatPhoneBR(e.target.value))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Descrição da Plataforma</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={onSaveWhiteLabel}>Salvar Customização</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="meu-plano" className="pt-4">
          <MyPlanTab />
        </TabsContent>

        <TabsContent value="planos-acao" className="pt-4">
          <ActionPlans />
        </TabsContent>

        <TabsContent value="responsaveis" className="pt-4">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Responsáveis Técnicos</h2>
                <div className="text-sm text-muted-foreground">Cadastros por parceiro e por empresa. Somente um "Principal" por escopo.</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="border rounded-md h-10 px-3 text-sm"
                  value={filterCompanyId}
                  onChange={(e)=> setFilterCompanyId(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="partner">Padrão do Parceiro</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button onClick={()=> { resetEditing(); setTrModalOpen(true); }}>Novo responsável</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left px-3 py-2">Escopo</th>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">Conselho</th>
                    <th className="text-left px-3 py-2">Registro</th>
                    <th className="text-left px-3 py-2">Contato</th>
                    <th className="text-left px-3 py-2">Principal</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(trs || [])
                    .filter(r => filterCompanyId === 'all' ? true : (filterCompanyId === 'partner' ? r.company_id === null : r.company_id === filterCompanyId))
                    .map((r) => {
                      const companyName = r.company_id ? (companies.find(c => c.id === r.company_id)?.name || r.company_id) : 'Padrão do Parceiro';
                      const contact = [r.contact_email, r.contact_phone].filter(Boolean).join(' | ');
                      return (
                        <tr key={r.id!} className="border-b last:border-0">
                          <td className="px-3 py-2 align-top">{companyName}</td>
                          <td className="px-3 py-2 align-top">{r.name}</td>
                          <td className="px-3 py-2 align-top">{r.council || '—'}</td>
                          <td className="px-3 py-2 align-top">{r.registration || '—'}</td>
                          <td className="px-3 py-2 align-top">{contact || '—'}</td>
                          <td className="px-3 py-2 align-top">
                            <button className={`px-2 py-1 rounded-md border ${r.is_primary ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'hover:bg-muted'}`} onClick={()=> setPrimary(r)}>
                              {r.is_primary ? 'Principal' : 'Definir' }
                            </button>
                          </td>
                          <td className="px-3 py-2 align-top text-right space-x-2">
                            <button className="px-2 py-1 rounded-md border hover:bg-muted" onClick={()=> editTR(r)}>Editar</button>
                            <button className="px-2 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50" onClick={()=> deleteTR(r)}>Excluir</button>
                          </td>
                        </tr>
                      );
                    })}
                  {(trs || []).length === 0 && (
                    <tr><td className="px-3 py-4 text-center text-muted-foreground" colSpan={7}>Nenhum responsável cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <Dialog open={trModalOpen} onOpenChange={setTrModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing?.id ? 'Editar Responsável Técnico' : 'Novo Responsável Técnico'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Escopo</label>
                    <select
                      className="border rounded-md h-10 px-3 text-sm"
                      value={editing?.company_id ? (editing.company_id || '') : ''}
                      onChange={(e)=> setEditing(editing ? { ...editing, company_id: e.target.value ? e.target.value : null } : editing)}
                    >
                      <option value="">Padrão do Parceiro</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome</label>
                    <Input value={editing?.name || ''} onChange={(e)=> setEditing(editing ? { ...editing, name: e.target.value } : editing)} className="h-10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conselho</label>
                      <Input value={editing?.council || ''} onChange={(e)=> setEditing(editing ? { ...editing, council: e.target.value } : editing)} className="h-10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Registro</label>
                      <Input value={editing?.registration || ''} onChange={(e)=> setEditing(editing ? { ...editing, registration: e.target.value } : editing)} className="h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Profissão</label>
                      <Input value={editing?.profession || ''} onChange={(e)=> setEditing(editing ? { ...editing, profession: e.target.value } : editing)} className="h-10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Telefone</label>
                      <Input
                        value={editing?.contact_phone || ''}
                        onChange={(e)=> setEditing(editing ? { ...editing, contact_phone: formatPhoneBR(e.target.value) } : editing)}
                        inputMode="tel"
                        placeholder="(11) 98765-4321"
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input type="email" value={editing?.contact_email || ''} onChange={(e)=> setEditing(editing ? { ...editing, contact_email: e.target.value } : editing)} className="h-10" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isPrimary" type="checkbox" checked={!!editing?.is_primary} onChange={(e)=> setEditing(editing ? { ...editing, is_primary: e.target.checked } : editing)} />
                    <label htmlFor="isPrimary" className="text-sm">Principal</label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=> { setTrModalOpen(false); }}>{'Cancelar'}</Button>
                  <Button onClick={saveTR}>{editing?.id ? 'Salvar alterações' : 'Adicionar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </TabsContent>

        <TabsContent value="membros" className="pt-4">
          <Membros />
        </TabsContent>

        {false && (
          <TabsContent value="suporte" className="pt-4">
            <Card className="p-6 text-sm text-muted-foreground">Informações de suporte (a ser implementado).</Card>
          </TabsContent>
        )}

        {false && (
          <TabsContent value="plano-acao" className="pt-4">
            <Card className="p-6 text-sm text-muted-foreground">Plano de Ação (a ser implementado).</Card>
          </TabsContent>
        )}

        {false && (
          <TabsContent value="plano-acao-v2" className="pt-4">
            <Card className="p-6 text-sm text-muted-foreground">Plano de Ação V2 (a ser implementado).</Card>
          </TabsContent>
        )}

        {false && (
          <TabsContent value="config-automatica" className="pt-4">
            <Card className="p-6 text-sm text-muted-foreground">Configuração Automática (a ser implementado).</Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Configuracoes;