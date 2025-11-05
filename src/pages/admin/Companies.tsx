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
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession

type Company = {
  id: string;
  name: string;
  partner_id: string;
  city?: string;
  cnpj?: string;
  responsible_user_id?: string;
  assessment_type_id?: string;
  cnae?: string;
  risk_grade_id?: string;
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
};

type Partner = { id: string; name: string; status?: "active" | "inactive"; responsible_email?: string };
type AssessmentType = { id: string; name?: string; status?: "active" | "inactive" };
type RiskGrade = { id: string; name?: string; status?: "active" | "inactive" };

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// CPF/CNPJ helpers identical to earlier implementation
function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
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

const Companies = () => {
  const { session } = useSession(); // Use the reactive session
  const [companies, setCompanies] = useState<Company[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [riskGrades, setRiskGrades] = useState<RiskGrade[]>([]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // Form state
  const [partnerId, setPartnerId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<string | undefined>(undefined);
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

  // Responsáveis (via Supabase)
  const [responsibleOptions, setResponsibleOptions] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: comps, error: e1 }, { data: parts, error: e2 }, { data: types, error: e3 }, { data: risks, error: e4 }] =
        await Promise.all([
          supabase.from("companies").select("*").order("name", { ascending: true }),
          supabase.from("partners").select("id,name,status,responsible_email"),
          supabase.from("assessment_types").select("*"),
          supabase.from("risk_grades").select("*"),
        ]);
      if (e1 || e2 || e3 || e4) {
        console.error("Error loading companies page data", e1 || e2 || e3 || e4);
      }
      if (!mounted) return;
      setCompanies((comps as Company[]) ?? []);
      setPartners((parts as Partner[]) ?? []);
      setAssessmentTypes((types as AssessmentType[]) ?? []);
      setRiskGrades((risks as RiskGrade[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Carregar usuários do parceiro a partir de partner_members + profiles
  useEffect(() => {
    if (!partnerId) {
      setResponsibleOptions([]);
      return;
    }
    let mounted = true;
    (async () => {
      const { data: members, error } = await supabase
        .from("partner_members")
        .select("user_id")
        .eq("partner_id", partnerId);
      if (error || !members || members.length === 0) {
        console.log("[Companies] Nenhum membro encontrado para o parceiro:", partnerId, error);
        if (mounted) setResponsibleOptions([]);
        return;
      }
      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      if (profileError) {
        console.error("[Companies] Erro ao buscar profiles:", profileError);
        if (mounted) setResponsibleOptions([]);
        return;
      }
      const opts =
        (profiles?.map((p: any) => ({
          id: p.id as string,
          label: [p.first_name, p.last_name].filter(Boolean).join(" ") || (p.id as string),
        })) as Array<{ id: string; label: string }>) ?? [];
      console.log("[Companies] Responsáveis carregados:", opts);
      if (mounted) setResponsibleOptions(opts);
    })();
    return () => { mounted = false; };
  }, [partnerId]);

  const partnersById = useMemo(() => {
    const map: Record<string, Partner> = {};
    partners.forEach((p) => (map[p.id] = p));
    return map;
  }, [partners]);

  const activePartners = useMemo(
    () => partners.filter((p) => (p.status ?? "active") === "active"),
    [partners],
  );

  const activeAssessmentTypes = useMemo(
    () => assessmentTypes.filter((t) => (t.status ?? "active") === "active"),
    [assessmentTypes],
  );

  const activeRiskGrades = useMemo(
    () => riskGrades.filter((g) => (g.status ?? "active") === "active"),
    [riskGrades],
  );

  // Garantir que o responsibleUserId atual esteja nas options (mesmo que temporariamente)
  const displayResponsibleOptions = useMemo(() => {
    if (!responsibleUserId) return responsibleOptions;
    const hasCurrentValue = responsibleOptions.some(opt => opt.id === responsibleUserId);
    if (hasCurrentValue) return responsibleOptions;
    // Se o valor atual não está nas options, adiciona temporariamente
    return [{ id: responsibleUserId, label: "Carregando..." }, ...responsibleOptions];
  }, [responsibleOptions, responsibleUserId]);

  const totalCompanies = useMemo(() => companies.length, [companies]);

  const resetForm = () => {
    setPartnerId(undefined);
    setName("");
    setCnpj("");
    setResponsibleUserId(undefined);
    setAssessmentTypeId(undefined);
    setCnae("");
    setRiskGradeId(undefined);
    setZip("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("");
    setStateUF("");
    setEditingId(undefined);
    setIsEditing(false);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: Company) => {
    setIsEditing(true);
    setEditingId(c.id);
    setPartnerId(c.partner_id);
    setName(c.name ?? "");
    setCnpj(c.cnpj ?? "");
    setResponsibleUserId(c.responsible_user_id);
    setAssessmentTypeId(c.assessment_type_id);
    setCnae(c.cnae ?? "");
    setRiskGradeId(c.risk_grade_id);
    setZip(c.address?.zip ?? "");
    setStreet(c.address?.street ?? "");
    setNumber(c.address?.number ?? "");
    setNeighborhood(c.address?.neighborhood ?? "");
    setCity(c.address?.city ?? c.city ?? "");
    setStateUF(c.address?.state ?? "");
    setOpen(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      showError("Informe o nome da empresa.");
      return;
    }
    if (!partnerId) {
      showError("Selecione um parceiro.");
      return;
    }

    const digits = onlyDigits(cnpj);
    const formattedDoc = digits.length ? (digits.length <= 11 ? formatCPF(digits) : formatCNPJ(digits)) : undefined;

    const payload: any = {
      id: editingId,
      partner_id: partnerId,
      name: name.trim(),
      cnpj: formattedDoc || null,
      responsible_user_id: responsibleUserId || null,
      assessment_type_id: assessmentTypeId || null,
      cnae: cnae.trim() || null,
      risk_grade_id: riskGradeId || null,
      city: city.trim() || null,
      address: {
        zip: formatCEP(zip) || null,
        street: street.trim() || null,
        number: number.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        state: stateUF.trim().toUpperCase() || null,
      },
    };

    const { data, error } = await supabase.from("companies").upsert(payload).select("*").single();
    if (error) {
      console.error("Failed to upsert company:", error);
      showError("Não foi possível salvar a empresa.");
      return;
    }
    const saved = data as Company;
    setCompanies((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
    });

    setOpen(false);
    resetForm();
    showSuccess(isEditing ? "Empresa atualizada." : "Empresa criada.");
  };

  const openDelete = (c: Company) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("companies").delete().eq("id", deleteTarget.id);
    if (error) {
      showError("Falha ao excluir empresa.");
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    showSuccess("Empresa excluída.");
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
    } catch (_e) {
      showError("Falha ao consultar CNPJ (CORS/indisponível). Preencha manualmente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as empresas cadastradas pelos parceiros. Total: {totalCompanies}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-1">
              {/* Parceiro e Responsável */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Parceiro</div>
                  <Select value={partnerId} onValueChange={(v) => { setPartnerId(v); setResponsibleUserId(undefined); }}>
                    <SelectTrigger className="h-10 focus-brand-glow">
                      <SelectValue placeholder="Selecione um parceiro" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePartners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Selecionar Responsável</div>
                  <Select
                    value={responsibleUserId || ""}
                    onValueChange={(val) => setResponsibleUserId(val || undefined)}
                    disabled={!partnerId || displayResponsibleOptions.length === 0}
                  >
                    <SelectTrigger className="h-10 focus-brand-glow">
                      <SelectValue placeholder={!partnerId ? "Selecione um parceiro primeiro" : (displayResponsibleOptions.length ? "Selecione o responsável" : "Nenhum responsável disponível")} />
                    </SelectTrigger>
                    <SelectContent>
                      {displayResponsibleOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nome e CNPJ */}
              <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
                <div className="space-y-2">
                  <label htmlFor="empresa-nome" className="text-sm font-medium">Nome da Empresa</label>
                  <Input
                    id="empresa-nome"
                    placeholder="Ex.: EMPRESA DE LIMPEZA URBANA"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10"
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
                      className="h-10"
                    />
                    <Button type="button" variant="secondary" onClick={lookupCNPJ} disabled={loadingCnpj}>
                      {loadingCnpj ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tipo de Avaliação, CNAE e Grau de Risco */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Tipo de Avaliação</div>
                  <Select value={assessmentTypeId} onValueChange={setAssessmentTypeId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={activeAssessmentTypes.length ? "Selecione um tipo" : "Nenhum tipo ativo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAssessmentTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name ?? t.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="empresa-cnae" className="text-sm font-medium">CNAE do Estabelecimento</label>
                  <Input
                    id="empresa-cnae"
                    placeholder="Ex.: 8121-4/00 - Limpeza em prédios e domicílios"
                    value={cnae}
                    onChange={(e) => setCnae(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Grau de Risco</div>
                  <Select value={riskGradeId} onValueChange={setRiskGradeId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={activeRiskGrades.length ? "Selecione o grau" : "Nenhum grau ativo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeRiskGrades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name ?? g.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="h-10"
                  />
                  <Input
                    placeholder="Logradouro"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    placeholder="Número"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_220px_120px]">
                  <Input
                    placeholder="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    placeholder="UF"
                    value={stateUF}
                    onChange={(e) => setStateUF(e.target.value.toUpperCase().slice(0, 2))}
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
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] cursor-default">
                <TableHead className="text-white first:rounded-tl-xl">Empresa</TableHead>
                <TableHead className="text-white">Cidade</TableHead>
                <TableHead className="text-white">Parceiro</TableHead>
                <TableHead className="text-white">Email do Parceiro</TableHead>
                <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => { // Changed from sortedCompanies to companies
                const partner = partnersById[c.partner_id];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        {c.cnpj ? (
                          <span className="text-xs text-muted-foreground">{c.cnpj}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{c.city ?? c.address?.city ?? "—"}</TableCell>
                    <TableCell>{partner?.name ?? "—"}</TableCell>
                    <TableCell className="truncate max-w-[280px]">{partner?.responsible_email ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(c)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {companies.length === 0 && ( // Changed from sortedCompanies to companies
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhuma empresa cadastrada.
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
    </div>
  );
};

export default Companies;