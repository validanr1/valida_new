"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Download,
  CreditCard,
  Plus,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError } from "@/utils/toast";
import LoadingSpinner from "@/components/LoadingSpinner";

type Plan = {
  id: string;
  name: string;
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
};

type PlanAssignment = {
  id: string;
  partner_id: string;
  plan_id: string;
  active_from?: string | null;
  created_at?: string | null;
  plans: Plan; // Relação com a tabela de planos
};

type UsageCounter = {
  companies_count?: number;
  active_employees_count?: number;
  active_assessments_count?: number;
  complaints_count?: number;
};

type Invoice = {
  id: string;
  partner_id: string;
  amount: number;
  status: "open" | "paid" | "canceled" | "overdue";
  due_date: string;
  issued_at?: string | null;
  paid_at?: string | null;
};

const MyPlanTab = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [currentAssignment, setCurrentAssignment] = useState<PlanAssignment | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const plansSectionRef = useRef<HTMLDivElement | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");
  const generateWhatsappLink = (plan: Plan) => {
    const fallbackNumber = "5582981266172";
    const numberDigits = onlyDigits(supportWhatsapp) || onlyDigits(import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) || fallbackNumber;
    const priceNew = formatCurrency(plan.total_price);
    const currentName = (currentAssignment?.plans?.name) ? currentAssignment.plans.name : "N/A";
    const priceCurrent = formatCurrency(currentAssignment?.plans?.total_price);
    const msg = `Olá! Gostaria de trocar do plano ${currentName} (${priceCurrent} /mês) para o plano ${plan.name} (${priceNew} /mês). Pode me orientar sobre a contratação?`;
    return `https://wa.me/${numberDigits}?text=${encodeURIComponent(msg)}`;
  };

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch companies for the partner to get their IDs
        const { data: partnerCompaniesRaw, error: companiesError } = await supabase
          .from("companies")
          .select("id")
          .eq("partner_id", partnerId);

        if (companiesError) {
          console.error("Error fetching partner companies:", companiesError);
          throw companiesError;
        }
        const partnerCompanies = (partnerCompaniesRaw ?? []) as { id: string }[];
        const companyIds = partnerCompanies.map((c) => c.id);

        // Partner info (support whatsapp, name)
        const { data: partnerRow } = await supabase
          .from("partners")
          .select("name,support_whatsapp")
          .eq("id", partnerId)
          .maybeSingle();
        setSupportWhatsapp((partnerRow as any)?.support_whatsapp ?? null);
        setPartnerName((partnerRow as any)?.name ?? null);

        const [
          { data: assignmentData, error: assignmentError },
          { count: employeesCount, error: employeesError },
          { count: assessmentsCount, error: assessmentsError },
          { count: complaintsCount, error: complaintsError },
          { data: invoicesData, error: invoicesError },
          { data: plansData, error: plansError },
        ] = await Promise.all([
          supabase
            .from("plan_assignments")
            .select("*, plans(*)")
            .eq("partner_id", partnerId)
            .order("active_from", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Fetch active employees count
          supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .in("company_id", companyIds)
            .eq("status", "active"),
          // Fetch assessments count
          supabase
            .from("assessments")
            .select("*", { count: "exact", head: true })
            .eq("partner_id", partnerId),
          // Fetch complaints count
          supabase
            .from("denuncias")
            .select("*", { count: "exact", head: true })
            .eq("partner_id", partnerId),
          // Fetch invoices
          supabase
            .from("invoices")
            .select("*")
            .eq("partner_id", partnerId)
            .order("issued_at", { ascending: false }),
          // Fetch available plans
          supabase.from("plans").select("*").order("total_price", { ascending: true }),
        ]);

        if (assignmentError) console.error("Error fetching current assignment:", assignmentError);
        if (employeesError) console.error("Error fetching employees count:", employeesError);
        if (assessmentsError) console.error("Error fetching assessments count:", assessmentsError);
        if (complaintsError) console.error("Error fetching complaints count:", complaintsError);
        if (invoicesError) console.error("Error fetching invoices:", invoicesError);
        if (plansError) console.error("Error fetching plans:", plansError);

        if (!mounted) return;

        const usageData: UsageCounter = {
          companies_count: companyIds.length,
          active_employees_count: employeesCount ?? 0,
          active_assessments_count: assessmentsCount ?? 0,
          complaints_count: complaintsCount ?? 0,
        };

        // Ensure we have the plan details; if not, fetch by plan_id
        let assignment: PlanAssignment | null = (assignmentData as any) || null;
        if (assignment && !assignment.plans && assignment.plan_id) {
          const { data: planRow } = await supabase
            .from("plans")
            .select("*")
            .eq("id", assignment.plan_id)
            .maybeSingle();
          if (planRow) {
            assignment = { ...(assignment as any), plans: planRow } as PlanAssignment;
          }
        }

        setCurrentAssignment(assignment);
        setUsage(usageData);
        setInvoices((invoicesData as Invoice[]) || []);
        setAvailablePlans((plansData as Plan[]) || []);
      } catch (error) {
        console.error("Failed to fetch MyPlanTab data:", error);
        showError("Falha ao carregar os dados do seu plano.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  const currentPlan = currentAssignment?.plans;
  const currentPlanLimits = currentPlan?.limits;

  const formatCurrency = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";

  const formatDate = (isoDate?: string | null) => {
    if (!isoDate) return "N/A";
    try {
      return new Date(isoDate).toLocaleDateString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  const periodSuffix = (period?: Plan["period"]) => {
    switch (period) {
      case "monthly":
        return "/mensal";
      case "quarterly":
        return "/trimestral";
      case "semiannual":
        return "/semestral";
      case "yearly":
        return "/anual";
      default:
        return "";
    }
  };

  const getNextBillingDate = (assignment?: PlanAssignment | null) => {
    if (!assignment?.active_from || !assignment.plans?.period) return "N/A";
    const startDate = new Date(assignment.active_from);
    let nextDate = new Date(startDate);

    switch (assignment.plans.period) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "semiannual":
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return "N/A";
    }
    return nextDate.toLocaleDateString("pt-BR");
  };

  const getProgressValue = (current: number | undefined, limit: number | undefined) => {
    if (typeof current !== "number" || typeof limit !== "number" || limit === 0) return 0;
    return (current / limit) * 100;
  };

  const getPlanFeatures = (plan: Plan) => {
    const features = [];
    if (plan.limits?.active_assessments) {
      features.push(`${plan.limits.active_assessments} Avaliações/mês`);
    } else if (plan.limits?.active_assessments === 0) {
      features.push(`0 Avaliações/mês`);
    } else {
      features.push(`Avaliações Ilimitadas`);
    }
    if (plan.limits?.companies) {
      features.push(`${plan.limits.companies} Empresas`);
    } else if (plan.limits?.companies === 0) {
      features.push(`0 Empresas`);
    } else {
      features.push(`Empresas Ilimitadas`);
    }
    if (plan.limits?.active_employees) {
      features.push(`${plan.limits.active_employees} Funcionários`);
    } else if (plan.limits?.active_employees === 0) {
      features.push(`0 Funcionários`);
    } else {
      features.push(`Funcionários Ilimitados`);
    }
    if (plan.complaint_limit !== undefined && plan.complaint_limit !== null) {
      if (plan.complaint_limit === 0) {
        features.push(`Denúncias Ilimitadas`);
      } else {
        features.push(`${plan.complaint_limit} Denúncias`);
      }
    }
    if (plan.description) {
      features.push(plan.description);
    }
    return features;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando meu plano...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Meu Plano</h2>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Plano Atual</h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            ATIVO
          </span>
        </div>
        {currentPlan ? (
          <div>
            <p className="text-2xl font-bold text-zinc-900">
              {currentPlan.name}
            </p>
            <p className="text-3xl font-extrabold text-primary mt-1">
              {formatCurrency(currentPlan.total_price)}
              <span className="text-base font-medium text-muted-foreground">{periodSuffix(currentPlan.period)}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Próxima cobrança: {getNextBillingDate(currentAssignment)}
            </p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => plansSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Fazer Upgrade <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhum plano ativo encontrado.</p>
        )}
      </Card>

      {/* Usage and Limits */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Uso e Limites</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Avaliações Processadas</span>
              <span>
                {usage?.active_assessments_count ?? 0} /{" "}
                {currentPlanLimits?.active_assessments === undefined ? "∞" : currentPlanLimits.active_assessments}
              </span>
            </div>
            <Progress
              value={getProgressValue(
                usage?.active_assessments_count,
                currentPlanLimits?.active_assessments,
              )}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Empresas Cadastradas</span>
              <span>
                {usage?.companies_count ?? 0} /{" "}
                {currentPlanLimits?.companies === undefined ? "∞" : currentPlanLimits.companies}
              </span>
            </div>
            <Progress
              value={getProgressValue(
                usage?.companies_count,
                currentPlanLimits?.companies,
              )}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Funcionários Ativos</span>
              <span>
                {usage?.active_employees_count ?? 0} /{" "}
                {currentPlanLimits?.active_employees === undefined ? "∞" : currentPlanLimits.active_employees}
              </span>
            </div>
            <Progress
              value={getProgressValue(
                usage?.active_employees_count,
                currentPlanLimits?.active_employees,
              )}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Denúncias Recebidas</span>
              <span>
                {usage?.complaints_count ?? 0} /{" "}
                {currentPlan?.complaint_limit === undefined || currentPlan?.complaint_limit === null || currentPlan?.complaint_limit === 0 ? "∞" : currentPlan.complaint_limit}
              </span>
            </div>
            <Progress
              value={getProgressValue(
                usage?.complaints_count,
                currentPlan?.complaint_limit || undefined,
              )}
              className="h-2"
            />
          </div>
        </div>
      </Card>

      {false && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Histórico de Cobrança</h3>
          <div className="space-y-3">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      Fatura - {formatDate(invoice.issued_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(invoice.amount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        invoice.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {invoice.status === "paid" ? "Pago" : "Em Aberto"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma fatura encontrada.</p>
            )}
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <div className="space-y-4" ref={plansSectionRef}>
        <h3 className="text-lg font-semibold">Planos Disponíveis</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col ${
                currentPlan?.id === plan.id ? "border-primary shadow-md" : ""
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold">{plan.name}</h4>
                {currentPlan?.id === plan.id && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Plano Atual
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold text-zinc-900">
                {formatCurrency(plan.total_price)}
                <span className="text-base font-medium text-muted-foreground">{periodSuffix(plan.period)}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground flex-1">
                {getPlanFeatures(plan).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              {currentPlan?.id === plan.id ? (
                <Button className="mt-6 w-full" disabled>
                  Plano Atual
                </Button>
              ) : (
                <Button
                  className="mt-6 w-full"
                  onClick={() => { const url = generateWhatsappLink(plan); window.open(url, "_blank", "noopener"); }}
                >
                  Selecionar Plano
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      
    </div>
  );
};

export default MyPlanTab;