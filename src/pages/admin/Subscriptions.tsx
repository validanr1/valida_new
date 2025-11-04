import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Partner = { id: string; name: string };
type Plan = { id: string; name: string; period: "monthly"|"quarterly"|"yearly"; total_price?: number|null };
type Subscription = {
  id: string;
  partner_id: string;
  plan_id: string;
  status: "active"|"canceled";
  period: "monthly"|"quarterly"|"yearly";
  price?: number|null;
  started_at?: string|null;
  ends_at?: string|null;
};

const Subscriptions = () => {
  const { session } = useSession(); // Use the reactive session
  const [partners, setPartners] = useState<Partner[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [partnerFilter, setPartnerFilter] = useState<string|undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string|undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: ps }, { data: pls }, { data: ss }] = await Promise.all([
        supabase.from("partners").select("id,name").order("name", { ascending: true }),
        supabase.from("plans").select("id,name,period,total_price"),
        supabase.from("subscriptions").select("*").order("started_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setPartners((ps as Partner[]) ?? []);
      setPlans((pls as Plan[]) ?? []);
      setSubs((ss as Subscription[]) ?? []);
    })();
    return () => { mounted = false; };
  }, [session?.user_id]); // Depend on session.user_id to re-fetch data if user changes

  const partnersById = useMemo(() => {
    const m: Record<string, Partner> = {};
    partners.forEach(p => m[p.id] = p);
    return m;
  }, [partners]);

  const plansById = useMemo(() => {
    const m: Record<string, Plan> = {};
    plans.forEach(p => m[p.id] = p);
    return m;
  }, [plans]);

  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (partnerFilter && s.partner_id !== partnerFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [subs, partnerFilter, statusFilter]);

  const cancelSub = async (sub: Subscription) => {
    if (!confirm("Cancelar esta assinatura?")) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: now, ends_at: now })
      .eq("id", sub.id);
    if (error) {
      showError("Falha ao cancelar assinatura.");
      return;
    }
    setSubs(prev => prev.map(x => x.id === sub.id ? { ...x, status: "canceled", canceled_at: now, ends_at: now } as any : x));
    showSuccess("Assinatura cancelada.");
  };

  const currency = (v?: number|null) => typeof v === "number" ? v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "—";
  const fmtDate = (iso?: string|null) => iso ? new Date(iso).toLocaleDateString() : "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as assinaturas dos parceiros.</p>
        </div>
        <div className="flex gap-2">
          <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todos os parceiros" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Todos status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="canceled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Parceiro</TableHead>
              <TableHead className="text-white">Plano</TableHead>
              <TableHead className="text-white">Preço</TableHead>
              <TableHead className="text-white">Período</TableHead>
              <TableHead className="text-white">Início</TableHead>
              <TableHead className="text-white">Fim</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => {
              const plan = plansById[s.plan_id];
              const partner = partnersById[s.partner_id];
              const badgeCls = s.status === "active"
                ? "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-emerald-100 border-emerald-200 text-emerald-700"
                : "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-red-100 border-red-200 text-red-700";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{partner?.name ?? "—"}</TableCell>
                  <TableCell>{plan?.name ?? "—"}</TableCell>
                  <TableCell>{currency(s.price ?? plan?.total_price ?? null)}</TableCell>
                  <TableCell className="capitalize">{s.period}</TableCell>
                  <TableCell>{fmtDate(s.started_at)}</TableCell>
                  <TableCell>{fmtDate(s.ends_at)}</TableCell>
                  <TableCell><span className={badgeCls}>{s.status === "active" ? "Ativa" : "Cancelada"}</span></TableCell>
                  <TableCell className="text-right space-x-2">
                    {s.status === "active" && (
                      <Button size="sm" variant="destructive" onClick={() => cancelSub(s)}>
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Subscriptions;