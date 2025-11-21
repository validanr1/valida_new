import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import CompanyCard from "@/components/partner/CompanyCard";
import { Plus } from "lucide-react";
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
import { setCurrentCompany } from "@/services/auth";

type Company = {
  id: string;
  partner_id: string;
  name: string;
  cnpj?: string;
  responsible_name?: string;
  responsible_email?: string;
  responsible_position?: string; // Cargo do responsável
  assessment_type_id?: string;
  cnae?: string;
  risk_grade_id?: string;
  city?: string;
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  created_at?: string; // Adicionado created_at
  assessment_quota?: number; // Cota de avaliações para esta empresa
};

type AssessmentType = { id: string; name?: string; status?: "active" | "inactive" };
type RiskGrade = { id: string; name?: string; status?: "active" | "inactive" };

type Plan = {
  id: string;
  name: string;
  period: "monthly" | "quarterly" | "semiannual" | "yearly";
  limits: { companies?: number | null } | null;
  total_price?: number | null;
};
type PlanAssignment = { plan_id: string; plans?: Plan | null } | null;

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// CPF: 000.000.000-00
function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// CNPJ: 00.000.000/0000-00
function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatDoc(v: string) {
  const d = onlyDigits(v);
  if (d.length <= 11) return formatCPF(d);
  return formatCNPJ(d);
}

const formatCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const Empresas = () => {
  const { session } = useSession();
  const partnerId = session?.partnerId!;
  const selectedCompanyId = session?.company_id;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [riskGrades, setRiskGrades] = useState<RiskGrade[]>([]);
  const [companyAssessmentStats, setCompanyAssessmentStats] = useState<Record<string, { used: number; remaining: number }>>({});

  // modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [assessmentQuota, setAssessmentQuota] = useState<string>(""); // Cota de avaliações

  // form
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePosition, setResponsiblePosition] = useState("");
  const [assessmentTypeId, setAssessmentTypeId] = useState<string | undefined>(undefined);
  const [cnae, setCnae] = useState("");
  const [riskGradeId, setRiskGradeId] = useState<string | undefined>(undefined);
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  // Upgrade state
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<PlanAssignment>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Carrega empresas do parceiro (depende do partnerId)
  useEffect(() => {
    if (!partnerId) {
      setCompanies([]);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setCompanies(data ?? []);
      // Carregar estatísticas de avaliações das empresas
      if (data && data.length > 0) {
        await loadCompanyAssessmentStats();
      }
    })();
    return () => { mounted = false; };
  }, [partnerId]);

  // Fetch partner plan, plans list and support whatsapp
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!partnerId) return;
      try {
        const [assignmentRes, plansRes, partnerRes] = await Promise.all([
          supabase
            .from("plan_assignments")
            .select("*, plans(*)")
            .eq("partner_id", partnerId)
            .order("active_from", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("plans").select("*").order("total_price", { ascending: true }),
          supabase.from("partners").select("name,support_whatsapp").eq("id", partnerId).maybeSingle(),
        ]);
        if (!mounted) return;
        setCurrentAssignment((assignmentRes.data as any) || null);
        setAvailablePlans((plansRes.data as any) || []);
        setSupportWhatsapp((partnerRes.data as any)?.support_whatsapp ?? null);
        setPartnerName((partnerRes.data as any)?.name ?? null);
      } catch (e) {
        console.error("[Empresas] Falha ao carregar planos/assignment:", e);
      }
    })();
    return () => { mounted = false; };
  }, [partnerId]);

  // Carrega catálogos independentemente do partnerId para não bloquear os selects
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [typesFn, risksFn] = await Promise.all([
        supabase.functions.invoke("catalogs", { body: { resource: "assessment_types" } }),
        supabase.functions.invoke("catalogs", { body: { resource: "risk_grades" } }),
      ]);
      if (!mounted) return;
      setAssessmentTypes(((typesFn.data as any)?.items ?? []) as any);
      setRiskGrades(((risksFn.data as any)?.items ?? []) as any);
    })();
    return () => { mounted = false; };
  }, []);

  const loadCompanyAssessmentStats = async () => {
    if (!partnerId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_company_assessment_stats', { partner_id_param: partnerId });

      if (error) {
        console.error('Erro ao carregar estatísticas de avaliações:', error);
        return;
      }

      if (data) {
        const stats: Record<string, { used: number; remaining: number }> = {};
        data.forEach((stat) => {
          stats[stat.company_id] = {
            used: stat.used_assessments,
            remaining: stat.remaining_assessments
          };
        });
        setCompanyAssessmentStats(stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const resetForm = () => {
    setEditingId(undefined);
    setName("");
    setCnpj("");
    setResponsibleName("");
    setResponsibleEmail("");
    setResponsiblePosition("");
    setAssessmentTypeId(undefined);
    setCnae("");
    setRiskGradeId(undefined);
    setZip("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("");
    setStateUF("");
    setAssessmentQuota(""); // Reset cota de avaliações
  };

  const openCreate = () => {
    // Plan limit check for companies
    const currentPlan = currentAssignment?.plans;
    const companiesLimit = currentPlan?.limits?.companies;
    const currentCount = companies.length;
    if (typeof companiesLimit === "number" && companiesLimit >= 0 && currentCount >= companiesLimit) {
      setUpgradeOpen(true);
      return;
    }
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditingId(c.id);
    setName(c.name ?? "");
    setCnpj(c.cnpj ?? "");
    setResponsibleName(c.responsible_name ?? "");
    setResponsibleEmail(c.responsible_email ?? "");
    setResponsiblePosition(c.responsible_position ?? "");
    setAssessmentTypeId(c.assessment_type_id);
    setCnae(c.cnae ?? "");
    setRiskGradeId(c.risk_grade_id);
    setZip(c.address?.zip ?? "");
    setStreet(c.address?.street ?? "");
    setNumber(c.address?.number ?? "");
    setNeighborhood(c.address?.neighborhood ?? "");
    setCity(c.address?.city ?? c.city ?? "");
    setStateUF(c.address?.state ?? "");
    setAssessmentQuota(c.assessment_quota?.toString() ?? ""); // Carregar cota de avaliações
    setOpen(true);
  };

  const emailValid = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome da empresa.");
      return;
    }
    if (!emailValid(responsibleEmail.trim())) {
      showError("Informe um e-mail válido para o responsável.");
      return;
    }
    const digits = onlyDigits(cnpj);
    const formattedDoc = digits ? (digits.length <= 11 ? formatCPF(digits) : formatCNPJ(digits)) : undefined;

    const isNewCompany = !editingId; // Check if it's a new company being created

    const payload: Partial<Company> = {
      id: editingId,
      partner_id: partnerId,
      name: name.trim(),
      cnpj: formattedDoc,
      responsible_name: responsibleName.trim() || null,
      responsible_email: responsibleEmail.trim().toLowerCase() || null,
      responsible_position: responsiblePosition.trim() || null,
      assessment_type_id: assessmentTypeId,
      cnae: cnae.trim() || null,
      risk_grade_id: riskGradeId,
      city: (city || null),
      assessment_quota: assessmentQuota ? parseInt(assessmentQuota) : 0, // Cota de avaliações
      address: {
        zip: formatCEP(zip) || null,
        street: street.trim() || null,
        number: number.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        state: stateUF.trim().toUpperCase() || null,
      },
    };

    setIsSaving(true);

    try {
      const { data, error } = await supabase.from("companies").upsert(payload as any).select("*");
      if (error) {
        console.error("[Empresas] Erro ao salvar a empresa:", error);
        showError(`Não foi possível salvar a empresa: ${error.message}`);
        return;
      }
      const saved = data?.[0] as Company;
      setCompanies((prev) => {
        const exists = prev.some((x) => x.id === saved.id);
        // Se estiver editando, atualiza. Se for novo, adiciona no início da lista.
        return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
      });

      // Update usage_counters if it's a new company
      if (isNewCompany) {
        const { error: usageError } = await supabase.functions.invoke("update-company-count", {
          body: { partner_id: partnerId, operation: 'increment' },
          headers: { "Content-Type": "application/json" },
        });
        if (usageError) {
          console.error("[Empresas] Erro ao atualizar contador de empresas:", usageError);
          showError("Empresa criada, mas falha ao atualizar contador de uso.");
        }
      }

      setOpen(false);
      resetForm();
      // Se não há empresa selecionada na sessão, define a recém-criada como atual
      if (!selectedCompanyId && saved?.id) {
        setCurrentCompany(saved.id);
      }
      // Notifica outros componentes (CompanySelect) para recarregar
      window.dispatchEvent(new CustomEvent("companies_changed"));
      showSuccess(editingId ? "Empresa atualizada." : "Empresa criada.");
    } catch (err) {
      console.error("[Empresas] Erro inesperado ao salvar a empresa:", err);
      showError("Ocorreu um erro inesperado ao salvar a empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = (company: Company) => {
    setDeleteTarget(company);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("companies").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir a empresa.");
      return;
    }
    // Atualiza lista e ajusta seleção caso necessário
    setCompanies((prev) => {
      const next = prev.filter((c) => c.id !== deleteTarget.id);
      if (deleteTarget.id === selectedCompanyId) {
        const fallbackId = next[0]?.id;
        setCurrentCompany(fallbackId || "");
      }
      return next;
    });

    // Decrement usage_counters
    const { error: usageError } = await supabase.functions.invoke("update-company-count", {
      body: { partner_id: partnerId, operation: 'decrement' },
      headers: { "Content-Type": "application/json" },
    });
    if (usageError) {
      console.error("[Empresas] Erro ao atualizar contador de empresas após exclusão:", usageError);
      showError("Empresa excluída, mas falha ao atualizar contador de uso.");
    }

    setDeleteOpen(false);
    setDeleteTarget(null);
    // Notifica outros componentes (CompanySelect) para recarregar
    window.dispatchEvent(new CustomEvent("companies_changed"));
    showSuccess("Empresa excluída.");
  };

  const handleSelectCompany = (company: Company) => {
    if (company.id === selectedCompanyId) return;
    setCurrentCompany(company.id);
    window.dispatchEvent(new CustomEvent("companies_changed"));
    showSuccess(`Empresa "${company.name}" selecionada.`);
  };

  async function lookupCNPJ() {
    const digits = onlyDigits(cnpj);
    if (digits.length !== 14) {
      showError("Para consulta, informe um CNPJ válido (14 dígitos).");
      return;
    }
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
      if (!res.ok) {
        showError("Não foi possível consultar o CNPJ agora.");
        setLoadingCnpj(false);
        return;
      }
      const data = await res.json();
      if (!name.trim() && data.razao_social) {
        setName(data.razao_social);
      }
      const est = data.estabelecimento;
      if (est) {
        if (!street && est.logradouro) setStreet(est.logradouro);
        if (!number && est.numero) setNumber(String(est.numero));
        if (!neighborhood && est.bairro) setNeighborhood(est.bairro);
        if (!city && est.cidade) setCity(est.cidade?.nome || est.cidade || "");
        if (!stateUF && est.estado) setStateUF(est.estado?.sigla || est.estado || "");
        if (!zip && est.cep) setZip(est.cep);
        if (!cnae) {
          const principal = est.atividade_principal || data.atividade_principal || est.cnae_principal;
          if (principal) {
            const desc = principal.descricao || principal.codigo || String(principal);
            setCnae(desc);
          }
        }
      }
      setCnpj(formatCNPJ(digits));
      showSuccess("Dados do CNPJ carregados.");
    } catch {
      showError("Falha ao consultar CNPJ (CORS/indisponível). Preencha manualmente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  const assessmentTypesById = useMemo(() => {
    const map: Record<string, AssessmentType> = {};
    assessmentTypes.forEach((t) => (map[t.id] = t));
    return map;
  }, [assessmentTypes]);

  const risksById = useMemo(() => {
    const map: Record<string, RiskGrade> = {};
    riskGrades.forEach((g) => (map[g.id] = g));
    return map;
  }, [riskGrades]);

  const typeAcronym = (id?: string) => {
    const nm = id ? assessmentTypesById[id]?.name || id : "";
    if (!nm) return undefined;
    const clean = nm.trim();
    if (clean.length <= 4) return clean.toUpperCase();
    const initials = clean
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() || "");
    const joined = initials.join("");
    return (joined || clean.toUpperCase()).slice(0, 3);
  };

  const list = useMemo(() => {
    return companies;
  }, [companies]);

  const total = list.length;

  const formatCurrency = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";

  const onlyDigitsLocal = (s: string | null | undefined) => (s || "").replace(/\D/g, "");
  const generateWhatsappLink = (plan: Plan) => {
    const number = onlyDigitsLocal(supportWhatsapp) || onlyDigitsLocal(import.meta.env.VITE_SUPPORT_WHATSAPP as any) || "5582981266172";
    const currentName = currentAssignment?.plans?.name || "N/A";
    const currentLimit = currentAssignment?.plans?.limits?.companies ?? null;
    const msg = `Olá! Sou ${partnerName || "parceiro"}. Atingi o limite de empresas do plano ${currentName} (limite: ${currentLimit ?? "ilimitado"}, atual: ${companies.length}). Gostaria de fazer upgrade para o plano ${plan.name} (limite empresas: ${plan.limits?.companies ?? "ilimitado"}, preço: ${formatCurrency(plan.total_price)}).`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Empresas</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Exibindo {total} {total === 1 ? "empresa" : "empresas"}
          </p>
        </div>

        {(() => {
          const companiesLimit = currentAssignment?.plans?.limits?.companies;
          const companyLimitReached = typeof companiesLimit === "number" && companiesLimit >= 0 && companies.length >= companiesLimit;
          return (
            <Button
              onClick={() => {
                if (companyLimitReached) { setUpgradeOpen(true); return; }
                openCreate();
              }}
              className="rounded-full bg-[#0E3A4D] px-4 text-white hover:bg-[#0c2f3e]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {companyLimitReached ? "Fazer Upgrade" : "Adicionar Empresa"}
            </Button>
          );
        })()}
      </div>

      {/* Resumo de Cotas de Avaliações */}
      {companies.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-900">Distribuição de Avaliações</h3>
              <p className="text-xs text-zinc-600">
                Total de cotas alocadas: {companies.reduce((sum, c) => sum + (c.assessment_quota || 0), 0)} /
                Limite do plano: {currentAssignment?.plans?.limits?.active_assessments || 0}
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              {companies.filter(c => (c.assessment_quota || 0) > 0).length} empresas com cota definida
            </div>
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[720px] z-[100] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Nome e CNPJ */}
            <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
              <div className="space-y-2">
                <label htmlFor="empresa-nome" className="text-sm font-medium">Nome da Empresa</label>
                <Input
                  id="empresa-nome"
                  placeholder="Ex.: EMPRESA DE LIMPEZA URBANA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="empresa-cnpj" className="text-sm font-medium">CNPJ/CPF</label>
                <div className="flex gap-2">
                  <Input
                    id="empresa-cnpj"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatDoc(e.target.value))}
                    className="h-10 rounded-xl"
                  />
                  <Button type="button" variant="secondary" onClick={lookupCNPJ} disabled={loadingCnpj}>
                    {loadingCnpj ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Responsável (agora campos de texto) */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Responsável</label>
                  <Input
                    placeholder="Ex.: Maria Silva"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail do Responsável</label>
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={responsibleEmail}
                    onChange={(e) => setResponsibleEmail(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo do Responsável</label>
                <Input
                  placeholder="Ex.: Gerente de Segurança, Coordenador de RH"
                  value={responsiblePosition}
                  onChange={(e) => setResponsiblePosition(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Tipo, CNAE, Grau */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Tipo de Avaliação</div>
                <Select value={assessmentTypeId} onValueChange={setAssessmentTypeId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={assessmentTypes.length ? "Selecione um tipo" : "Nenhum tipo ativo"} />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {assessmentTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name ?? t.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CNAE do Estabelecimento</label>
                <Input
                  id="empresa-cnae"
                  placeholder="Ex.: 8121-4/00 - Limpeza em prédios e domicílios"
                  value={cnae}
                  onChange={(e) => setCnae(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Grau de Risco</div>
                <Select value={riskGradeId} onValueChange={setRiskGradeId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={riskGrades.length ? "Selecione o grau" : "Nenhum grau ativo"} />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {riskGrades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name ?? g.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cota de Avaliações */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cota de Avaliações</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={assessmentQuota}
                  onChange={(e) => setAssessmentQuota(e.target.value.replace(/\D/g, ""))}
                  className="h-10 rounded-xl"
                />
                <div className="text-xs text-muted-foreground self-center">
                  0 = sem limite
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Número máximo de avaliações ativas permitidas para esta empresa
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Endereço</div>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr_120px]">
                <Input
                  placeholder="CEP"
                  value={zip}
                  onChange={(e) => setZip(formatCEP(e.target.value))}
                  className="h-10 rounded-xl"
                />
                <Input
                  placeholder="Logradouro"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Input
                  placeholder="Número"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_220px_120px]">
                <Input
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Input
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Input
                  placeholder="UF"
                  value={stateUF}
                  onChange={(e) => setStateUF(e.target.value.toUpperCase().slice(0, 2))}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : (editingId ? "Salvar alterações" : "Salvar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grid de cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <CompanyCard
            key={c.id}
            selected={c.id === selectedCompanyId}
            name={c.name}
            cnpj={c.cnpj}
            responsibleName={c.responsible_name}
            responsibleEmail={c.responsible_email}
            responsiblePosition={c.responsible_position}
            cnae={c.cnae}
            riskGradeName={c.risk_grade_id ? (risksById[c.risk_grade_id]?.name ?? c.risk_grade_id) : undefined}
            templateAcronym={typeAcronym(c.assessment_type_id)}
            templateName={c.assessment_type_id ? (assessmentTypesById[c.assessment_type_id]?.name ?? c.assessment_type_id) : undefined}
            assessmentQuota={c.assessment_quota}
            usedAssessments={companyAssessmentStats[c.id]?.used || 0}
            onEdit={() => openEdit(c)}
            onDelete={() => onDelete(c)}
            onSelect={() => handleSelectCompany(c)}
          />
        ))}
        {list.length === 0 && (
          <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
            Nenhuma empresa encontrada.
          </Card>
        )}
      </div>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name ?? "esta empresa"}</span>?
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

      {/* Upgrade dialog when company limit reached */}
      <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite de empresas atingido</AlertDialogTitle>
            <AlertDialogDescription>
              Seu plano atual ({currentAssignment?.plans?.name || "N/A"}) permite {currentAssignment?.plans?.limits?.companies ?? "∞"} empresas. Você já possui {companies.length}. Para cadastrar novas empresas, faça upgrade do plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {availablePlans
              .filter((p) => p.id !== currentAssignment?.plans?.id)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Limite de empresas: {p.limits?.companies ?? "∞"} • {formatCurrency(p.total_price)}/mês
                    </div>
                  </div>
                  <Button onClick={() => { window.open(generateWhatsappLink(p), "_blank", "noopener"); }}>Falar no WhatsApp</Button>
                </div>
              ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Empresas;