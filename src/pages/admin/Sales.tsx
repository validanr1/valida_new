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
import { Input } from "@/components/ui/input";
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
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Partner = { id: string; name: string; status?: "active" | "inactive"; responsible_email?: string };
type Plan = {
  id: string;
  name: string;
  status: "active" | "inactive";
  period: "monthly" | "quarterly" | "semiannual" | "yearly";
  total_price?: number | null;
  price_per_assessment?: number | null;
  description?: string | null;
};
type PlanAssignment = { id: string; partner_id: string; plan_id: string; active_from?: string | null; created_at?: string | null };

const Sales = () => {
  const { session } = useSession(); // Use the reactive session
  const [partners, setPartners] = useState<Partner[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [activeFrom, setActiveFrom] = useState<string>("");

  // Cancel confirmation dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetPartner, setCancelTargetPartner] = useState<Partner | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: ps, error: e1 }, { data: pls, error: e2 }, { data: assigns, error: e3 }] = await Promise.all([
        supabase.from("partners").select("id,name,status,responsible_email").order("name", { ascending: true }),
        supabase.from("plans").select("id,name,status,period,total_price,price_per_assessment,description").order("name", { ascending: true }),
        supabase.from("plan_assignments").select("id,partner_id,plan_id,active_from,created_at"),
      ]);
      if (e1 || e2 || e3) {
        console.error("Erro ao carregar dados de vendas:", e1 || e2 || e3);
        showError("Falha ao carregar dados de vendas.");
      }
      if (!mounted) return;
      setPartners((ps as Partner[]) ?? []);
      setPlans((pls as Plan[]) ?? []);
      setAssignments((assigns as PlanAssignment[]) ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user_id]); // Depend on session.user_id to re-fetch data if user changes

  const plansById = useMemo(() => {
    const map: Record<string, Plan> = {};
    plans.forEach((p) => (map[p.id] = p));
    return map;
  }, [plans]);

  const latestAssignmentByPartner = useMemo(() => {
    const map: Record<string, PlanAssignment | undefined> = {};
    const sorted = [...assignments].sort((a, b) => {
      const ta = new Date(a.active_from ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.active_from ?? b.created_at ?? 0).getTime();
      return tb - ta;
    });
    for (const a of sorted) {
      if (!map[a.partner_id]) map[a.partner_id] = a;
    }
    return map;
  }, [assignments]);

  const activePlans = useMemo(() => plans.filter((p) => (p.status ?? "active") === "active"), [plans]);

  const monthlyRevenue = useMemo(() => {
    let total = 0;
    for (const partner of partners) {
      const a = latestAssignmentByPartner[partner.id];
      if (!a) continue;
      const plan = a.plan_id ? plansById[a.plan_id] : undefined;
      if (!plan || typeof plan.total_price !== "number") continue;
      const divisor =
        plan.period === "monthly" ? 1 :
        plan.period === "quarterly" ? 3 :
        plan.period === "semiannual" ? 6 :
        12;
      total += plan.total_price / divisor;
    }
    return total;
  }, [partners, latestAssignmentByPartner, plansById]);

  const currency = (v?: number | null) =>
    typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  const openAssign = (partnerId: string) => {
    setEditingPartnerId(partnerId);
    setSelectedPlanId(undefined);
    const today = new Date();
    const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);
    setActiveFrom(iso);
    setOpen(true);
  };

  const openChange = (partnerId: string, currentPlanId?: string) => {
    setEditingPartnerId(partnerId);
    setSelectedPlanId(currentPlanId);
    const today = new Date();
    const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);
    setActiveFrom(iso);
    setOpen(true);
  };

  // Helpers de Assinaturas e Faturas
  async function createOrUpdateSubscription(partnerId: string, planId: string, startISO: string) {
    const plan = plansById[planId];
    const { data: currentSubs } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("status", "active");
    const activeSub = (currentSubs ?? [])[0];
    if (activeSub) {
      // Cancela anterior
      const now = new Date().toISOString();
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: now, ends_at: now })
        .eq("id", activeSub.id);
    }
    // Cria nova
    const { data: newSubData, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        partner_id: partnerId,
        plan_id: planId,
        status: "active",
        period: plan?.period ?? "monthly",
        price: plan?.total_price ?? null,
        started_at: new Date(startISO + "T00:00:00Z").toISOString(),
      } as any)
      .select("*");
    if (subErr) {
      showError("Falha ao salvar assinatura.");
      return null;
    }
    const sub = (newSubData ?? [])[0];
    return sub;
  }

  async function generateInitialInvoice(partnerId: string, subId: string, planId: string, dueISO: string) {
    const plan = plansById[planId];
    const amount = typeof plan?.total_price === "number" ? plan.total_price : 0;
    const { error } = await supabase.from("invoices").insert({
      partner_id: partnerId,
      subscription_id: subId,
      amount,
      currency: "BRL",
      status: "open",
      due_date: dueISO,
      issued_at: new Date().toISOString(),
    } as any);
    if (error) {
      showError("Assinatura criada, mas falha ao gerar fatura.");
    }
  }

  const cancelForPartner = async (partner: Partner) => {
    setCancelTargetPartner(partner);
    setCancelDialogOpen(true);
  };

  const confirmCancelForPartner = async () => {
    if (!cancelTargetPartner) return;

    const partnerId = cancelTargetPartner.id;

    try {
      const { error } = await supabase.from("plan_assignments").delete().eq("partner_id", partnerId);
      if (error) {
        showError("Não foi possível cancelar o plano.");
        return;
      }
      setAssignments((prev) => prev.filter((a) => a.partner_id !== partnerId));

      // Cancela assinatura ativa
      const { data: currentSubs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("partner_id", partnerId)
        .eq("status", "active");
      const activeSub = (currentSubs ?? [])[0];
      if (activeSub) {
        const now = new Date().toISOString();
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: now, ends_at: now })
          .eq("id", activeSub.id);
      }

      showSuccess("Plano/assinatura cancelados.");
    } catch (err) {
      console.error("Unexpected error:", err);
      showError("Falha inesperada ao cancelar plano.");
    } finally {
      setCancelDialogOpen(false);
      setCancelTargetPartner(null);
    }
  };

  const saveAssignment = async () => {
    if (!editingPartnerId || !selectedPlanId) {
      showError("Selecione um plano.");
      return;
    }
    const payload = {
      partner_id: editingPartnerId,
      plan_id: selectedPlanId,
      active_from: activeFrom ? new Date(activeFrom + "T00:00:00Z").toISOString() : new Date().toISOString(),
    } as Partial<PlanAssignment>;

    const { data, error } = await supabase.from("plan_assignments").upsert(payload).select("*");
    if (error) {
      showError("Não foi possível salvar a contratação.");
      return;
    }
    const saved = (data ?? [])[0] as PlanAssignment | undefined;
    if (saved) {
      setAssignments((prev) => {
        const next = prev.filter((a) => a.partner_id !== saved.partner_id);
        return [...next, saved];
      });
      // Cria/atualiza assinatura e fatura inicial
      const sub = await createOrUpdateSubscription(saved.partner_id, saved.plan_id, activeFrom || new Date().toISOString().slice(0,10));
      if (sub) {
        await generateInitialInvoice(saved.partner_id, sub.id, saved.plan_id, activeFrom || new Date().toISOString().slice(0,10));
      }
      showSuccess("Plano contratado/alterado e assinatura/fatura criadas.");
    } else {
      showSuccess("Plano contratado/alterado.");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vendas (Manual)</h1>
          <p className="text-sm text-muted-foreground">
            Contrate, altere ou cancele planos para os parceiros.
          </p>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-muted-foreground">Receita Mensal Estimada</div>
          <div className="text-xl font-bold">{currency(monthlyRevenue)}</div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Parceiro</TableHead>
                <TableHead className="text-white">Plano Atual</TableHead>
                <TableHead className="text-white">Período</TableHead>
                <TableHead className="text-white">Preço</TableHead>
                <TableHead className="text-white">Ativo desde</TableHead>
                <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => {
                const a = latestAssignmentByPartner[p.id];
                const plan = a?.plan_id ? plansById[a.plan_id] : undefined;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.responsible_email ?? "—"}</div>
                    </TableCell>
                    <TableCell>{plan?.name ?? "—"}</TableCell>
                    <TableCell>
                      {plan
                        ? (plan.period === "monthly"
                            ? "Mensal"
                            : plan.period === "quarterly"
                              ? "Trimestral"
                              : plan.period === "semiannual"
                                ? "Semestral"
                                : "Anual")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a?.active_from ? new Date(a.active_from).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!a ? (
                        <Button size="sm" onClick={() => openAssign(p.id)}>
                          Contratar plano
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openChange(p.id, a.plan_id)}>
                            Alterar plano
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => cancelForPartner(p)}>
                            Cancelar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhum parceiro cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingPartnerId(null); setSelectedPlanId(undefined); } }}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingPartnerId ? "Selecionar plano" : "Contratar plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <div className="text-sm font-medium">Plano</div>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="h-10 focus-brand-glow">
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name} • {pl.period === "monthly" ? "Mensal" : pl.period === "quarterly" ? "Trimestral" : pl.period === "semiannual" ? "Semestral" : "Anual"} • {currency(pl.total_price ?? null)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Início da vigência</label>
                <Input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="h-10 focus-brand-glow" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço</label>
                <Input
                  disabled
                  value={
                    selectedPlanId
                      ? currency(plansById[selectedPlanId!]?.total_price ?? null)
                      : ""
                  }
                  className="h-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveAssignment}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o plano do parceiro{" "}
              <span className="font-medium text-foreground">{cancelTargetPartner?.name ?? "selecionado"}</span>?
              Esta ação irá remover a atribuição do plano e cancelar qualquer assinatura ativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter plano</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmCancelForPartner}>
              Sim, cancelar plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;