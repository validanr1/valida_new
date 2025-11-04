import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

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

      <Dialog open={detailsOpen} onOpenChange={(v) => { setDetailsOpen(v); if (!v) setSelected(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Denúncia</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Parceiro</div>
                  <div className="text-sm">{partners[selected.partner_id!]?.name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Empresa</div>
                  <div className="text-sm">{companies[selected.company_id!]?.name ?? "—"}</div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Funcionário</div>
                  <div className="text-sm">{empName(employees[selected.employee_id!]) || employees[selected.employee_id!]?.email || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Data</div>
                  <div className="text-sm">{fmtDate(selected.created_at)}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Título</div>
                <div className="text-sm">{selected.title || "—"}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm">{fmtStatusPtBR(selected.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tratada</div>
                  <div className="text-sm">{(selected.treated ? "Sim" : "Não")}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Anexos</div>
                {Array.isArray((selected as any).attachments) && (selected as any).attachments.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(selected as any).attachments.map((p: string, idx: number) => (
                      <li key={idx}>
                        <a className="text-blue-600 underline" href={storagePublicUrl(p)} target="_blank" rel="noreferrer">
                          {p.split("/").pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum anexo</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Linha do tempo</div>
                <div className="space-y-2">
                  <div className="text-xs">Criada: {fmtDate(selected.created_at)}</div>
                  <div className="text-xs">Atualizada: {fmtDate((selected as any).updated_at)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Denuncias;
