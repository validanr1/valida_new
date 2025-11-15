import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

type LegalDoc = { id: string; tipo: "termos"|"privacidade"|"cookies"|"sla"|"lgpd"; versao: number; conteudo_html: string; data_publicacao?: string; ativo?: boolean };
type LgpdRequest = { id: string; user_id: string; tipo: "exclusao"|"correcao"|"portabilidade"; status: string; data_criacao?: string; data_resolucao?: string|null };

const types = [
  { id: "termos", label: "Termos de Uso" },
  { id: "privacidade", label: "Política de Privacidade" },
  { id: "cookies", label: "Política de Cookies" },
  { id: "sla", label: "SLA" },
  { id: "lgpd", label: "LGPD" },
] as const;

const Legal = () => {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [requests, setRequests] = useState<LgpdRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingTipo, setEditingTipo] = useState<LegalDoc["tipo"]>("termos");
  const [newVersionContent, setNewVersionContent] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState("");
  const [dpoName, setDpoName] = useState("");
  const [dpoEmail, setDpoEmail] = useState("");
  const [dpoPhone, setDpoPhone] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, "");
    if (!v) return "";
    if (v.length <= 2) return `(${v}`;
    if (v.length <= 6) return `(${v.slice(0,2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
    return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7,11)}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: d }, { data: r }, { data: s }] = await Promise.all([
        supabase.from("legal_documents").select("*").order("data_publicacao", { ascending: false }),
        supabase.from("lgpd_requests").select("*").order("data_criacao", { ascending: false }),
        supabase.from("platform_settings").select("dpo_name,dpo_email,dpo_phone,cookie_banner_enabled,cookie_banner_text").eq("id", "00000000-0000-0000-0000-000000000001").maybeSingle(),
      ]);
      if (!mounted) return;
      setDocs(Array.isArray(d) ? (d as any[]) as LegalDoc[] : []);
      setRequests(Array.isArray(r) ? (r as any[]) as LgpdRequest[] : []);
      if (s) {
        setDpoName((s as any).dpo_name ?? "");
        setDpoEmail((s as any).dpo_email ?? "");
        setDpoPhone((s as any).dpo_phone ?? "");
        setBannerEnabled(Boolean((s as any).cookie_banner_enabled));
        setBannerText((s as any).cookie_banner_text ?? "");
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const byType = useMemo(() => {
    const map: Record<string, LegalDoc[]> = {};
    docs.forEach((d) => { (map[d.tipo] = map[d.tipo] || []).push(d); });
    return map;
  }, [docs]);

  const activeVersion = useMemo(() => {
    const arr = byType[editingTipo] || [];
    return arr.find((x) => x.ativo) || null;
  }, [byType, editingTipo]);

  const nextVersionNumber = useMemo(() => {
    const arr = byType[editingTipo] || [];
    const max = arr.reduce((m, x) => Math.max(m, x.versao), 0);
    return max + 1;
  }, [byType, editingTipo]);

  useEffect(() => {
    const arr = byType[editingTipo] || [];
    const initial = (arr.find((x) => x.ativo)?.id) || arr[0]?.id || null;
    setSelectedVersionId(initial);
  }, [editingTipo, byType]);

  useEffect(() => {
    if (!selectedVersionId) { setEditorContent(""); return; }
    const arr = byType[editingTipo] || [];
    const doc = arr.find((d) => d.id === selectedVersionId);
    setEditorContent(doc?.conteudo_html || "");
  }, [selectedVersionId, byType, editingTipo]);

  const publishNewVersion = async () => {
    if (!newVersionContent.trim()) { showError("Insira conteúdo HTML da nova versão."); return; }
    const payload = { tipo: editingTipo, versao: nextVersionNumber, conteudo_html: newVersionContent, ativo: false };
    const { error } = await supabase.from("legal_documents").insert(payload);
    if (error) { showError("Falha ao criar nova versão."); return; }
    setDocs((prev) => [{ ...(payload as any), id: crypto.randomUUID(), data_publicacao: new Date().toISOString() }, ...prev]);
    setNewVersionContent("");
    showSuccess("Nova versão criada.");
  };

  const setActiveVersion = async (id: string) => {
    const tipo = editingTipo;
    const current = (byType[tipo] || []).find((x) => x.ativo);
    const updates = [] as Promise<any>[];
    if (current) updates.push(supabase.from("legal_documents").update({ ativo: false }).eq("id", current.id));
    updates.push(supabase.from("legal_documents").update({ ativo: true }).eq("id", id));
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) { showError("Falha ao publicar versão."); return; }
    setDocs((prev) => prev.map((x) => x.tipo === tipo ? { ...x, ativo: x.id === id } : x));
    showSuccess("Versão publicada.");
  };

  const saveEditedVersion = async () => {
    if (!selectedVersionId) { showError("Selecione uma versão."); return; }
    const { error } = await supabase.from("legal_documents").update({ conteudo_html: editorContent }).eq("id", selectedVersionId);
    if (error) { showError("Falha ao salvar alterações."); return; }
    setDocs((prev) => prev.map((x) => x.id === selectedVersionId ? { ...x, conteudo_html: editorContent } : x));
    showSuccess("Versão atualizada.");
  };

  const duplicateToNewVersion = async () => {
    if (!editorContent.trim()) { showError("Insira conteúdo HTML."); return; }
    const payload = { tipo: editingTipo, versao: nextVersionNumber, conteudo_html: editorContent, ativo: false };
    const { error } = await supabase.from("legal_documents").insert(payload);
    if (error) { showError("Falha ao criar duplicata."); return; }
    setDocs((prev) => [{ ...(payload as any), id: crypto.randomUUID(), data_publicacao: new Date().toISOString() }, ...prev]);
    showSuccess(`Versão v${nextVersionNumber} criada.`);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const payload = {
        dpo_name: dpoName || null,
        dpo_email: dpoEmail || null,
        dpo_phone: dpoPhone || null,
        cookie_banner_enabled: bannerEnabled,
        cookie_banner_text: bannerText || null,
      } as any;
      const upd = await supabase
        .from("platform_settings")
        .update(payload)
        .eq("id", "00000000-0000-0000-0000-000000000001");
      if (upd.error) {
        const ins = await supabase
          .from("platform_settings")
          .insert({ id: "00000000-0000-0000-0000-000000000001", ...payload });
        if (ins.error) throw ins.error;
      }
      showSuccess("Configurações salvas.");
    } catch (e) {
      showError("Falha ao salvar configurações.");
    } finally {
      setSavingConfig(false);
    }
  };

  const resetAllCookieConsent = async () => {
    const { error } = await supabase.from("cookie_consent").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    if (error) { showError("Falha ao resetar consentimentos."); return; }
    showSuccess("Consentimentos resetados.");
  };

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">Carregando módulo jurídico...</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Jurídico / LGPD</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie documentos legais, cookies e solicitações LGPD.</p>
      </div>

      <Card className="p-4">
        <Tabs defaultValue="docs">
          <TabsList className="w-full grid grid-cols-4 gap-2">
            <TabsTrigger value="docs" className="w-full">Documentos</TabsTrigger>
            <TabsTrigger value="cookies" className="w-full">Cookies</TabsTrigger>
            <TabsTrigger value="lgpd" className="w-full">Logs LGPD</TabsTrigger>
            <TabsTrigger value="dpo" className="w-full">DPO</TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="pt-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-2">
                <div className="text-sm font-medium">Tipo de Documento</div>
                <Select value={editingTipo} onValueChange={(v) => setEditingTipo(v as any)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Versão ativa: {activeVersion ? activeVersion.versao : "Nenhuma"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Nova Versão (HTML)</div>
                <Textarea rows={12} value={newVersionContent} onChange={(e) => setNewVersionContent(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={publishNewVersion}>Criar nova versão v{nextVersionNumber}</Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold">Histórico de Versões</div>
              <div className="grid gap-2">
                {(byType[editingTipo] || []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">v{d.versao} • {new Date(d.data_publicacao || d.updated_at as any).toLocaleString()} {d.ativo ? "• ativa" : ""}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSelectedVersionId(d.id)}>Editar</Button>
                      {!d.ativo && <Button variant="secondary" onClick={() => setActiveVersion(d.id)}>Publicar</Button>}
                    </div>
                  </div>
                ))}
                {(byType[editingTipo] || []).length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhuma versão cadastrada para este tipo.</div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold">Editar Versão</div>
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Selecionar Versão</div>
                  <Select value={selectedVersionId || undefined} onValueChange={(v) => setSelectedVersionId(v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(byType[editingTipo] || []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>v{d.versao} {d.ativo ? "• ativa" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Conteúdo (HTML)</div>
                  <Textarea rows={12} value={editorContent} onChange={(e) => setEditorContent(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={saveEditedVersion} disabled={!selectedVersionId}>Salvar alterações</Button>
                    <Button variant="secondary" onClick={duplicateToNewVersion}>Duplicar como v{nextVersionNumber}</Button>
                    {selectedVersionId && !((byType[editingTipo] || []).find(x => x.id === selectedVersionId)?.ativo) && (
                      <Button variant="outline" onClick={() => setActiveVersion(selectedVersionId!)}>Publicar selecionada</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cookies" className="pt-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Ativar Banner de Cookies</div>
                <Select value={bannerEnabled ? "on" : "off"} onValueChange={(v) => setBannerEnabled(v === "on")}> 
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">Ativado</SelectItem>
                    <SelectItem value="off">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Texto do Banner</div>
                <Textarea rows={4} value={bannerText} onChange={(e) => setBannerText(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveConfig} disabled={savingConfig}>{savingConfig ? "Salvando..." : "Salvar Configurações"}</Button>
              <Button variant="destructive" onClick={resetAllCookieConsent}>Resetar consentimento de todos os usuários</Button>
            </div>
          </TabsContent>

          <TabsContent value="lgpd" className="pt-4 space-y-4">
            <div className="text-sm font-semibold">Logs LGPD</div>
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Usuário</th>
                    <th className="p-2 text-left">Ação</th>
                    <th className="p-2 text-left">Data/Hora</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2">{r.id}</td>
                      <td className="p-2">{r.user_id}</td>
                      <td className="p-2">{r.tipo}</td>
                      <td className="p-2">{new Date(r.data_criacao || '').toLocaleString()}</td>
                      <td className="p-2">{r.status}</td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhuma solicitação.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="dpo" className="pt-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Nome</div>
                <Input value={dpoName} onChange={(e) => setDpoName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">E-mail</div>
                <Input type="email" value={dpoEmail} onChange={(e) => setDpoEmail(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Telefone</div>
                <Input value={dpoPhone} onChange={(e) => setDpoPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" className="h-10" />
              </div>
            </div>
            <div>
              <Button onClick={saveConfig} disabled={savingConfig}>{savingConfig ? "Salvando..." : "Salvar"}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Legal;