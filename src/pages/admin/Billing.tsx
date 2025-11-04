import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Partner = { id: string; name: string };
type Subscription = { id: string; partner_id: string; plan_id: string; status: "active"|"canceled" };
type Invoice = {
  id: string;
  subscription_id?: string|null;
  partner_id: string;
  amount: number;
  currency?: string|null;
  status: "open"|"paid"|"canceled"|"overdue";
  due_date: string; // ISO date
  issued_at?: string|null;
  paid_at?: string|null;
};
type Payment = {
  id: string;
  invoice_id: string;
  partner_id: string;
  amount: number;
  method?: string|null;
  status?: string|null;
  paid_at?: string|null;
};

const Billing = () => {
  const { session } = useSession(); // Use the reactive session
  const [partners, setPartners] = useState<Partner[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // filtros
  const [partnerFilter, setPartnerFilter] = useState<string|undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string|undefined>(undefined);

  // criar fatura
  const [openNew, setOpenNew] = useState(false);
  const [newPartnerId, setNewPartnerId] = useState<string|undefined>(undefined);
  const [newSubId, setNewSubId] = useState<string|undefined>(undefined);
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: ps }, { data: ss }, { data: inv }, { data: pay }] = await Promise.all([
        supabase.from("partners").select("id,name").order("name", { ascending: true }),
        supabase.from("subscriptions").select("id,partner_id,plan_id,status").order("started_at", { ascending: false }),
        supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
        supabase.from("payments").select("*").order("paid_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setPartners((ps as Partner[]) ?? []);
      setSubs((ss as Subscription[]) ?? []);
      setInvoices((inv as Invoice[]) ?? []);
      setPayments((pay as Payment[]) ?? []);
    })();
    return () => { mounted = false; };
  }, [session?.user_id]); // Depend on session.user_id to re-fetch data if user changes

  const partnerSubs = useMemo(() => {
    const map: Record<string, Subscription[]> = {};
    subs.forEach(s => { (map[s.partner_id] = map[s.partner_id] || []).push(s); });
    return map;
  }, [subs]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (partnerFilter && i.partner_id !== partnerFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, partnerFilter, statusFilter]);

  const currency = (v?: number|null) => typeof v === "number" ? v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "—";
  const fmtDate = (iso?: string|null) => iso ? new Date(iso).toLocaleString() : "—";

  const createInvoice = async () => {
    if (!newPartnerId || !newAmount || !newDueDate) {
      showError("Informe parceiro, valor e vencimento.");
      return;
    }
    const amount = Number(newAmount.replace(",", "."));
    const payload = {
      partner_id: newPartnerId,
      subscription_id: newSubId || null,
      amount,
      currency: "BRL",
      status: "open",
      due_date: newDueDate,
      issued_at: new Date().toISOString(),
    } as Partial<Invoice>;
    const { data, error } = await supabase.from("invoices").insert(payload as any).select("*");
    if (error) {
      showError("Falha ao criar fatura.");
      return;
    }
    const created = (data ?? [])[0] as Invoice;
    setInvoices(prev => [created, ...prev]);
    setOpenNew(false);
    setNewPartnerId(undefined);
    setNewSubId(undefined);
    setNewAmount("");
    setNewDueDate("");
    showSuccess("Fatura criada.");
  };

  const markPaid = async (inv: Invoice) => {
    if (inv.status === "paid") return;
    // 1) cria payment
    const { data: pay, error: payErr } = await supabase.from("payments").insert({
      invoice_id: inv.id,
      partner_id: inv.partner_id,
      amount: inv.amount,
      method: "manual",
      status: "completed",
      paid_at: new Date().toISOString(),
    } as any).select("*");
    if (payErr) {
      showError("Falha ao registrar pagamento.");
      return;
    }
    const payment = (pay ?? [])[0] as Payment;
    setPayments(prev => [payment, ...prev]);

    // 2) atualiza fatura
    const { data: invData, error: invErr } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: payment.paid_at })
      .eq("id", inv.id)
      .select("*");
    if (invErr) {
      showError("Pagamento registrado, mas falha ao atualizar fatura.");
      return;
    }
    const updated = (invData ?? [])[0] as Invoice;
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    showSuccess("Fatura marcada como paga.");
  };

  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm("Cancelar esta fatura?")) return;
    const { data, error } = await supabase.from("invoices").update({ status: "canceled" }).eq("id", inv.id).select("*");
    if (error) {
      showError("Falha ao cancelar fatura.");
      return;
    }
    const updated = (data ?? [])[0] as Invoice;
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    showSuccess("Fatura cancelada.");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie faturas e pagamentos.</p>
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
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="canceled">Canceladas</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>+ Nova fatura</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar fatura</DialogTitle></DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Parceiro</div>
                  <Select value={newPartnerId} onValueChange={(v) => { setNewPartnerId(v); setNewSubId(undefined); }}>
                    <SelectTrigger><SelectValue placeholder="Selecionar parceiro" /></SelectTrigger>
                    <SelectContent>
                      {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Assinatura (opcional)</div>
                  <Select value={newSubId} onValueChange={setNewSubId} disabled={!newPartnerId || (partnerSubs[newPartnerId!]?.length ?? 0) === 0}>
                    <SelectTrigger><SelectValue placeholder={!newPartnerId ? "Selecione um parceiro" : "Opcional"} /></SelectTrigger>
                    <SelectContent>
                      {(partnerSubs[newPartnerId!] ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.id.slice(0,8)}… • {s.status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Valor (R$)</div>
                    <Input type="number" step="0.01" inputMode="decimal" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Vencimento</div>
                    <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createInvoice}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Parceiro</TableHead>
              <TableHead className="text-white">Assinatura</TableHead>
              <TableHead className="text-white">Valor</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Vencimento</TableHead>
              <TableHead className="text-white">Emitida</TableHead>
              <TableHead className="text-white">Pago em</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map(inv => {
              const partner = partners.find(p => p.id === inv.partner_id);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{partner?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{inv.subscription_id ? inv.subscription_id.slice(0,8)+"…" : "—"}</TableCell>
                  <TableCell>{currency(inv.amount)}</TableCell>
                  <TableCell className="capitalize">{inv.status}</TableCell>
                  <TableCell>{inv.due_date ? new Date(inv.due_date+"T00:00:00Z").toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{fmtDate(inv.issued_at)}</TableCell>
                  <TableCell>{fmtDate(inv.paid_at)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {inv.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => markPaid(inv)}>Marcar paga</Button>
                        <Button size="sm" variant="destructive" onClick={() => cancelInvoice(inv)}>Cancelar</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Nenhuma fatura encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Pagamento</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Fatura</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pago em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(p => {
              const partner = partners.find(x => x.id === p.partner_id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{p.id.slice(0,8)}…</TableCell>
                  <TableCell>{partner?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.invoice_id.slice(0,8)}…</TableCell>
                  <TableCell>{currency(p.amount)}</TableCell>
                  <TableCell>{p.method ?? "—"}</TableCell>
                  <TableCell className="capitalize">{p.status ?? "completed"}</TableCell>
                  <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              );
            })}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhum pagamento registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Billing;