import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError, showSuccess } from "@/utils/toast";
import { Clock, MessageSquare, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Report = {
  id: string;
  partner_id?: string;
  company_id?: string;
  employee_id?: string;
  title?: string;
  status?: string;
  treated?: boolean;
  created_at?: string;
};

const Denuncias = () => {
  const { session } = useSession();
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;
  const partnerId = (session as any)?.partner_id ?? (session as any)?.partnerId;

  const [items, setItems] = useState<Report[]>([]);
  const [partners, setPartners] = useState<Record<string, { id: string; name: string }>>({});
  const [companies, setCompanies] = useState<Record<string, { id: string; name: string }>>({});
  const [employees, setEmployees] = useState<Record<string, { id: string; first_name?: string; last_name?: string; email?: string }>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  
  // Modal treatment states
  const [newStatus, setNewStatus] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!partnerId || !companyId) {
        setItems([]);
        return;
      }
      const [{ data: rows }, { data: parts }, { data: comps }, { data: emps }] = await Promise.all([
        supabase
          .from("denuncias")
          .select("id, partner_id, company_id, employee_id, title:titulo, description:descricao, status, treated:tratada, department:setor, role:cargo, created_at, updated_at, attachments:anexos")
          .eq("partner_id", partnerId)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase.from("partners").select("id,name"),
        supabase.from("companies").select("id,name"),
        supabase.from("employees").select("id,first_name,last_name,email"),
      ]);
      if (!mounted) return;
      setItems((rows as any) ?? []);
      const pMap: Record<string, any> = {};
      (parts as any)?.forEach((p: any) => (pMap[p.id] = p));
      setPartners(pMap);
      const cMap: Record<string, any> = {};
      (comps as any)?.forEach((c: any) => (cMap[c.id] = c));
      setCompanies(cMap);
      const eMap: Record<string, any> = {};
      (emps as any)?.forEach((e: any) => (eMap[e.id] = e));
      setEmployees(eMap);
    })();
    return () => { mounted = false; };
  }, [partnerId, companyId]); // Depend on reactive partnerId and companyId

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR");
    } catch {
      return iso;
    }
  };

  const storagePublicUrl = (path: string) => {
    try {
      const { data } = supabase.storage.from("denuncias").getPublicUrl(path);
      return data.publicUrl || "";
    } catch {
      return "";
    }
  };

  const empName = (e?: { first_name?: string; last_name?: string }) => [e?.first_name, e?.last_name].filter(Boolean).join(" ");

  // Load comments when modal opens
  useEffect(() => {
    if (detailsOpen && selected) {
      setNewStatus(selected.status || "open");
      loadComments(selected.id);
    }
  }, [detailsOpen, selected]);

  const loadComments = async (reportId: string) => {
    const { data } = await supabase
      .from("denuncia_comments")
      .select("*")
      .eq("denuncia_id", reportId)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setIsSaving(true);
    
    const updates: any = { status: newStatus };
    if (newStatus === "resolved") {
      updates.tratada = true; // Campo em português
    }

    const { error } = await supabase
      .from("denuncias")
      .update(updates)
      .eq("id", selected.id);

    if (error) {
      console.error("[Denuncias] Erro ao atualizar status:", error);
      showError(`Erro ao atualizar status: ${error.message}`);
      setIsSaving(false);
      return;
    }

    // Add comment if provided
    if (newComment.trim()) {
      await supabase.from("denuncia_comments").insert({
        denuncia_id: selected.id,
        user_id: session?.user?.id,
        comment: newComment.trim(),
        status_changed_to: newStatus,
      });
      setNewComment("");
    }

    // Reload data
    setItems(prev => prev.map(item => 
      item.id === selected.id ? { ...item, status: newStatus, treated: newStatus === "resolved" } : item
    ));
    await loadComments(selected.id);
    showSuccess("Status atualizado com sucesso");
    setIsSaving(false);
  };

  const handleAddComment = async () => {
    if (!selected || !newComment.trim()) return;
    setIsSaving(true);

    const { error } = await supabase.from("denuncia_comments").insert({
      denuncia_id: selected.id,
      user_id: session?.user?.id,
      comment: newComment.trim(),
    });

    if (error) {
      showError("Erro ao adicionar comentário");
      setIsSaving(false);
      return;
    }

    setNewComment("");
    await loadComments(selected.id);
    showSuccess("Comentário adicionado");
    setIsSaving(false);
  };

  const fmtStatusPtBR = (s?: string) => {
    if (!s) return "—";
    const map: Record<string, string> = {
      open: "Aberta",
      in_progress: "Em andamento",
      resolved: "Resolvida",
      rejected: "Rejeitada",
    };
    return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
  };

  const treatedBadge = (r: Report) => {
    const t = r.treated ?? (r.status ? r.status === "resolved" : false);
    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${t ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-red-100 border-red-200 text-red-700"}`}>
        {t ? "Sim" : "Não"}
      </span>
    );
  };

  if (!companyId) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para visualizar as denúncias.</div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Data</TableHead>
              <TableHead className="text-white">Empresa</TableHead>
              <TableHead className="text-white">Título</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Tratada</TableHead>
              <TableHead className="text-white">Anexos</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const c = r.company_id ? companies[r.company_id] : undefined;
              const e = r.employee_id ? employees[r.employee_id] : undefined;
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.created_at)}</TableCell>
                  <TableCell>{c?.name ?? "—"}</TableCell>
                  <TableCell>{r.title ?? "—"}</TableCell>
                  <TableCell>{fmtStatusPtBR(r.status)}</TableCell>
                  <TableCell>{treatedBadge(r)}</TableCell>
                  <TableCell>
                    {Array.isArray((r as any).attachments) && (r as any).attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {((r as any).attachments as string[]).slice(0, 3).map((p, idx) => (
                          <a
                            key={idx}
                            href={storagePublicUrl(p)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {p.split("/").pop()}
                          </a>
                        ))}
                        {((r as any).attachments as string[]).length > 3 && (
                          <span className="text-xs text-muted-foreground">+{((r as any).attachments as string[]).length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => { setSelected(r); setDetailsOpen(true); }}>Detalhes</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhuma denúncia encontrada para esta empresa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={(v) => { setDetailsOpen(v); if (!v) { setSelected(null); setNewComment(""); } }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Gerenciar Denúncia
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              ID: {selected?.id}
            </p>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 py-2">
              {/* Informações Básicas */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Informações da Denúncia
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Empresa</div>
                    <div className="text-sm font-medium">{companies[selected.company_id!]?.name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Data</div>
                    <div className="text-sm">{fmtDate(selected.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Funcionário</div>
                    <div className="text-sm">{empName(employees[selected.employee_id!]) || employees[selected.employee_id!]?.email || "Anônimo"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Setor</div>
                    <div className="text-sm">{(selected as any).department || "—"}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Título</div>
                  <div className="text-sm font-medium">{selected.title || "—"}</div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Descrição</div>
                  <div className="text-sm whitespace-pre-wrap">{(selected as any).description || "—"}</div>
                </div>
                {Array.isArray((selected as any).attachments) && (selected as any).attachments.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">Anexos</div>
                    <div className="flex flex-wrap gap-2">
                      {(selected as any).attachments.map((p: string, idx: number) => (
                        <a
                          key={idx}
                          href={storagePublicUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded border px-3 py-1 text-xs hover:bg-muted transition-colors"
                        >
                          📎 {p.split("/").pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Status e Tratamento */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {selected.status === "resolved" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                   selected.status === "rejected" ? <XCircle className="h-4 w-4 text-red-600" /> :
                   <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  Status e Tratamento
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Status Atual</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberta</SelectItem>
                          <SelectItem value="in_progress">Em andamento</SelectItem>
                          <SelectItem value="resolved">Resolvida</SelectItem>
                          <SelectItem value="rejected">Rejeitada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tratada</label>
                      <div className="mt-2">
                        {treatedBadge(selected)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Adicionar Comentário/Nota</label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Descreva as ações tomadas, observações ou atualizações..."
                      className="mt-1 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveStatus} 
                      disabled={isSaving || newStatus === selected.status}
                      className="flex-1"
                    >
                      {isSaving ? "Salvando..." : "Atualizar Status"}
                    </Button>
                    {newComment.trim() && newStatus === selected.status && (
                      <Button 
                        onClick={handleAddComment} 
                        disabled={isSaving}
                        variant="outline"
                      >
                        Adicionar Comentário
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Linha do Tempo / Histórico */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Linha do Tempo
                </h3>
                <div className="space-y-3">
                  {/* Evento de criação */}
                  <div className="flex gap-3 pb-3 border-b">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">{fmtDate(selected.created_at)}</div>
                      <div className="text-sm font-medium">Denúncia criada</div>
                      <div className="text-xs text-muted-foreground">Status inicial: {fmtStatusPtBR("open")}</div>
                    </div>
                  </div>

                  {/* Comentários/Histórico */}
                  {comments.map((comment, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">{fmtDate(comment.created_at)}</div>
                        {comment.status_changed_to && (
                          <div className="text-sm font-medium">
                            Status alterado para: <Badge variant="outline">{fmtStatusPtBR(comment.status_changed_to)}</Badge>
                          </div>
                        )}
                        {comment.comment && (
                          <div className="text-sm mt-1 whitespace-pre-wrap">{comment.comment}</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Nenhum comentário ou atualização ainda
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Denuncias;
