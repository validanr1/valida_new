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

type Plan = {
  id: string;
  name: string;
  status: "active" | "inactive";
  period: "monthly" | "quarterly" | "semiannual" | "yearly";
  limits: {
    active_assessments?: number;
    companies?: number;
    active_employees?: number;
  } | null;
  complaint_limit?: number | null;
  price_per_assessment?: number | null;
  total_price?: number | null;
  badge?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const periodLabel: Record<Plan["period"], string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // form state
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Plan["status"]>("active");
  const [period, setPeriod] = useState<Plan["period"]>("monthly");
  const [limitAssessments, setLimitAssessments] = useState<string>("");
  const [limitCompanies, setLimitCompanies] = useState<string>("");
  const [limitEmployees, setLimitEmployees] = useState<string>("");
  const [complaintLimit, setComplaintLimit] = useState<string>("");
  const [pricePerAssessment, setPricePerAssessment] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [badge, setBadge] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from("plans").select("*").order("name", { ascending: true });
      if (error) {
        console.error("Failed to load plans:", error);
        return;
      }
      if (mounted) setPlans((data as Plan[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = () => {
    setName("");
    setStatus("active");
    setPeriod("monthly");
    setLimitAssessments("");
    setLimitCompanies("");
    setLimitEmployees("");
    setComplaintLimit("");
    setPricePerAssessment("");
    setTotalPrice("");
    setBadge("");
    setDescription("");
    setEditingId(undefined);
    setIsEditing(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (pl: Plan) => {
    setIsEditing(true);
    setEditingId(pl.id);
    setName(pl.name ?? "");
    setStatus(pl.status ?? "active");
    setPeriod(pl.period ?? "monthly");
    setLimitAssessments(
      typeof pl.limits?.active_assessments === "number" ? String(pl.limits.active_assessments) : ""
    );
    setLimitCompanies(
      typeof pl.limits?.companies === "number" ? String(pl.limits.companies) : ""
    );
    setLimitEmployees(
      typeof pl.limits?.active_employees === "number" ? String(pl.limits.active_employees) : ""
    );
    setComplaintLimit(
      typeof pl.complaint_limit === "number" ? String(pl.complaint_limit) : ""
    );
    setPricePerAssessment(
      typeof pl.price_per_assessment === "number" ? String(pl.price_per_assessment) : ""
    );
    setTotalPrice(typeof pl.total_price === "number" ? String(pl.total_price) : "");
    setBadge(pl.badge ?? "");
    setDescription(pl.description ?? "");
    setOpen(true);
  };

  const parseNum = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome do plano.");
      return;
    }

    const payload: Partial<Plan> = {
      id: editingId,
      name: name.trim(),
      status,
      period,
      limits: {
        active_assessments: parseNum(limitAssessments) ?? undefined,
        companies: parseNum(limitCompanies) ?? undefined,
        active_employees: parseNum(limitEmployees) ?? undefined,
      },
      complaint_limit: parseNum(complaintLimit) ?? 0,
      price_per_assessment: parseNum(pricePerAssessment) ?? undefined,
      total_price: parseNum(totalPrice) ?? undefined,
      badge: badge.trim() || null,
      description: description.trim() || null,
    };

    const { data, error } = await supabase.from("plans").upsert(payload).select("*");
    if (error) {
      console.error("Failed to save plan:", error);
      showError("Falha ao salvar o plano.");
      return;
    }
    const saved = data?.[0] as Plan;
    if (!saved) {
      showError("Falha ao salvar o plano: nenhum dado retornado.");
      return;
    }

    setPlans((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });

    setOpen(false);
    resetForm();
    showSuccess(isEditing ? "Plano atualizado." : "Plano criado.");
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const openDelete = (pl: Plan) => {
    setDeleteTarget(pl);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("plans").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir plano.");
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Plano excluído.");
  };

  const currency = (v?: number | null) =>
    typeof v === "number"
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const numOrDash = (v?: number | null) => (typeof v === "number" ? v : "—");

  const totalPlans = useMemo(() => plans.length, [plans]);

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os planos disponíveis para os parceiros. Total: {totalPlans}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="whitespace-nowrap">+ Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="plano-nome" className="text-sm font-medium">Nome do Plano</label>
                  <Input
                    id="plano-nome"
                    placeholder="Ex.: Starter, Pro..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Status</div>
                  <Select value={status} onValueChange={(v: Plan["status"]) => setStatus(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Período</div>
                  <Select value={period} onValueChange={(v: Plan["period"]) => setPeriod(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Período de cobrança" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="semiannual">Semestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="preco-av" className="text-sm font-medium">Preço por Avaliação (R$)</label>
                  <Input
                    id="preco-av"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0,00"
                    value={pricePerAssessment}
                    onChange={(e) => setPricePerAssessment(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="preco-total" className="text-sm font-medium">Preço Total (R$)</label>
                  <Input
                    id="preco-total"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0,00"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="lim-av" className="text-sm font-medium">Limite de Avaliações</label>
                  <Input
                    id="lim-av"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex.: 100"
                    value={limitAssessments}
                    onChange={(e) => setLimitAssessments(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lim-empresas" className="text-sm font-medium">Limite de Empresas</label>
                  <Input
                    id="lim-empresas"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex.: 10"
                    value={limitCompanies}
                    onChange={(e) => setLimitCompanies(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lim-func" className="text-sm font-medium">Limite de Funcionários</label>
                  <Input
                    id="lim-func"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex.: 1500"
                    value={limitEmployees}
                    onChange={(e) => setLimitEmployees(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-1">
                <div className="space-y-2">
                  <label htmlFor="lim-denuncias" className="text-sm font-medium">Limite de Denúncias</label>
                  <Input
                    id="lim-denuncias"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex.: 50 (0 = ilimitado)"
                    value={complaintLimit}
                    onChange={(e) => setComplaintLimit(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">0 = denúncias ilimitadas</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="badge" className="text-sm font-medium">Badge (opcional)</label>
                  <Input
                    id="badge"
                    placeholder="Ex.: Mais vendido"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="desc" className="text-sm font-medium">Descrição (opcional)</label>
                  <Input
                    id="desc"
                    placeholder="Breve descrição do plano"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onSave}>{isEditing ? "Salvar alterações" : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Nome do Plano</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Período</TableHead>
                <TableHead className="text-white">Lim. Avaliações</TableHead>
                <TableHead className="text-white">Lim. Empresas</TableHead>
                <TableHead className="text-white">Lim. Funcionários</TableHead>
                <TableHead className="text-white">Lim. Denúncias</TableHead>
                <TableHead className="text-white">Preço/Aval.</TableHead>
                <TableHead className="text-white">Preço Total</TableHead>
                <TableHead className="text-white">Badge</TableHead>
                <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => {
                const st = p.status ?? "active";
                const statusClasses =
                  st === "inactive"
                    ? "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-red-100 border-red-200 text-red-700"
                    : "inline-flex items-center rounded-md border px-2 py-0.5 text-xs bg-emerald-100 border-emerald-200 text-emerald-700";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.badge ? (
                          <span className="rounded-md border px-2 py-0.5 text-xs">{p.badge}</span>
                        ) : null}
                      </div>
                      {p.description ? (
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={statusClasses}>{st === "inactive" ? "Inativo" : "Ativo"}</span>
                    </TableCell>
                    <TableCell>{periodLabel[p.period ?? "monthly"]}</TableCell>
                <TableCell>{numOrDash(p.limits?.active_assessments ?? undefined)}</TableCell>
                <TableCell>{numOrDash(p.limits?.companies ?? undefined)}</TableCell>
                <TableCell>{numOrDash(p.limits?.active_employees ?? undefined)}</TableCell>
                <TableCell>{numOrDash(p.complaint_limit ?? undefined)}</TableCell>
                <TableCell>{currency(p.price_per_assessment ?? null)}</TableCell>
                <TableCell>{currency(p.total_price ?? null)}</TableCell>
                <TableCell>{p.badge ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDelete(p)}>
                    Excluir
                  </Button>
                </TableCell>
                  </TableRow>
                );
              })}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground">
                    Nenhum plano cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "este plano"}</span>?
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
    </div>
  );
};

export default Plans;