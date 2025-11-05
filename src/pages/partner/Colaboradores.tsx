import { useEffect, useMemo, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";

type Employee = {
  id: string;
  company_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  cpf_cnpj?: string;
  registration_number?: string;
  phone?: string;
  date_of_birth?: string;
  department_id?: string;
  role_id?: string;
  admission_date?: string;
  gender?: string;
  education_level?: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

type Plan = {
  id: string;
  name: string;
  period: "monthly" | "quarterly" | "semiannual" | "yearly";
  limits: {
    active_assessments?: number;
    companies?: number;
    active_employees?: number;
  } | null;
  total_price?: number | null;
};

type PlanAssignment = {
  id: string;
  plan_id: string;
  plans?: Plan | null;
} | null;

// Helpers para formatação de CPF/CNPJ e Telefone (mascaras)
const formatCPF = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCNPJ = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

// Conversão para input date (YYYY-MM-DD)
const dateToInputValue = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Máscara de telefone
const maskPhone = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Colaboradores = () => {
  const { session } = useSession();
  const companyId = session?.company_id;
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; department_id?: string }>>([]);

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  // Form state (date fields as strings for flexible typing)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>(""); // YYYY-MM-DD string
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [admissionDate, setAdmissionDate] = useState<string>(""); // YYYY-MM-DD string
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [educationLevel, setEducationLevel] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState<number>(0);
  const [employeesLimit, setEmployeesLimit] = useState<number | undefined>(undefined);
  const [loadingLimits, setLoadingLimits] = useState<boolean>(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<PlanAssignment>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Import Wizard state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({
    first_name: "",
    last_name: "",
    email: "",
    cpf_cnpj: "",
    registration_number: "",
    phone: "",
    date_of_birth: "",
    admission_date: "",
    department: "",
    role: "",
    gender: "",
    education_level: "",
    status: "",
  });

  // Observações ocupando linha inteira
  const [observations, setObservations] = useState<string>("");

  // Load initial data
  useEffect(() => {
    if (!companyId) {
      setEmployees([]);
      setDepartments([]);
      setRoles([]);
      return;
    }
    let mounted = true;
    (async () => {
      const [{ data: emps }, { data: depts }, { data: rs }] = await Promise.all([
        supabase.from("employees").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("departments").select("id,name").eq("company_id", companyId).order("name", { ascending: true }),
        supabase.from("roles").select("id,name,department_id").order("name", { ascending: true }),
      ]);
      if (!mounted) return;
      setEmployees((emps as Employee[]) ?? []);
      setDepartments((depts as Array<{ id: string; name: string }>) ?? []);
      setRoles((rs as Array<{ id: string; name: string; department_id?: string }>) ?? []);
    })();
    return () => { mounted = false; };
  }, [companyId]);

  useEffect(() => {
    let mounted = true;
    const loadLimits = async () => {
      if (!partnerId) {
        setEmployeesLimit(undefined);
        setActiveEmployeesCount(0);
        return;
      }
      setLoadingLimits(true);
      try {
        const { data: partnerCompaniesRaw } = await supabase
          .from("companies")
          .select("id")
          .eq("partner_id", partnerId);
        const partnerCompanies = (partnerCompaniesRaw ?? []) as { id: string }[];
        const companyIds = partnerCompanies.map((c) => c.id);

        const [assignmentRes, employeesRes, plansRes, partnerRes] = await Promise.all([
          supabase
            .from("plan_assignments")
            .select("*, plans(*)")
            .eq("partner_id", partnerId)
            .order("active_from", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .in("company_id", companyIds)
            .eq("status", "active"),
          supabase.from("plans").select("*").order("total_price", { ascending: true }),
          supabase.from("partners").select("name,support_whatsapp").eq("id", partnerId).maybeSingle(),
        ]);

        if (!mounted) return;
        const assignment = (assignmentRes as any)?.data ?? (assignmentRes as any) ?? null;
        const employeesCount = (employeesRes as any)?.count ?? (employeesRes as any) ?? 0;
        const lim = (assignment as any)?.plans?.limits?.active_employees as number | undefined;
        setCurrentAssignment(assignment as any);
        setAvailablePlans(((plansRes as any)?.data ?? []) as Plan[]);
        setSupportWhatsapp(((partnerRes as any)?.data as any)?.support_whatsapp ?? null);
        setPartnerName(((partnerRes as any)?.data as any)?.name ?? null);
        setEmployeesLimit(lim);
        setActiveEmployeesCount(employeesCount ?? 0);
      } finally {
        if (mounted) setLoadingLimits(false);
      }
    };
    loadLimits();
    return () => { mounted = false; };
  }, [partnerId]);

  // -------- Import Wizard helpers --------
  const readFileText = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const startImportWizard = () => {
    setImportOpen(true);
    setImportStep(1);
    setImportFileName("");
    setImportHeaders([]);
    setImportRows([]);
    setHeaderMap((prev) => ({ ...prev, first_name: "" }));
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getSampleCsv = () => {
    const headers = [
      'first_name','last_name','email','cpf_cnpj','registration_number','phone','date_of_birth','admission_date','department','role','gender','education_level','status'
    ];
    const rows = [
      ['Joao','Silva','joao.silva@empresa.com','12345678909','MAT-001','(82) 99999-9999','1990-05-20','2020-01-10','Operacional','Auxiliar','masculino','medio','active'],
      ['Maria','Souza','maria.souza@empresa.com','98765432100','MAT-002','(11) 98888-7777','1988-10-05','2021-03-15','Administrativo','Assistente','feminino','superior','inactive'],
    ];
    const esc = (v: any) => String(v).replace(/"/g, '""');
    const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    return csv;
  };

  const handleUploadFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await readFileText(f);
      const rows = parseCsv(text);
      if (!rows.length) { showError("CSV vazio."); return; }
      setImportFileName(f.name);
      setImportRows(rows);
      setImportHeaders(Object.keys(rows[0] ?? {}));
      // Autodetect some headers
      const lower = importHeaders.map((h) => h.toLowerCase());
      const findCol = (alts: string[]) => importHeaders.find((h) => alts.includes(h.toLowerCase())) || "";
      setHeaderMap((prev) => ({
        ...prev,
        first_name: findCol(["first_name","nome","primeiro_nome"]) || prev.first_name,
        last_name: findCol(["last_name","sobrenome"]) || prev.last_name,
        email: findCol(["email","e_mail"]) || prev.email,
      }));
      setImportStep(3); // Jump to mapping after upload
    } catch {
      showError("Falha ao ler o arquivo.");
    }
  };

  const buildRowFromMap = (r: any) => {
    const pick = (key: string) => (headerMap[key] ? r[headerMap[key]] : "");
    return {
      first_name: String(pick("first_name") || ""),
      last_name: String(pick("last_name") || ""),
      email: String(pick("email") || ""),
      cpf_cnpj: String(pick("cpf_cnpj") || ""),
      registration_number: String(pick("registration_number") || ""),
      phone: String(pick("phone") || ""),
      date_of_birth: String(pick("date_of_birth") || ""),
      admission_date: String(pick("admission_date") || ""),
      department: String(pick("department") || ""),
      role: String(pick("role") || ""),
      gender: String(pick("gender") || ""),
      education_level: String(pick("education_level") || ""),
      status: String((pick("status") || "active")).toLowerCase(),
    };
  };

  const remainingActiveSlots = () => {
    if (employeesLimit === undefined) return Infinity;
    return Math.max(0, (employeesLimit ?? 0) - activeEmployeesCount);
  };

  const confirmImportFromWizard = async () => {
    if (!companyId) { showError("Selecione uma empresa no topo."); return; }
    if (!importRows.length) { showError("Nenhum dado para importar."); return; }
    setIsImporting(true);
    try {
      const mapped = importRows.map(buildRowFromMap);
      const byDeptName: Record<string, string> = {};
      departments.forEach((d) => (byDeptName[d.name.toLowerCase()] = d.id));
      const byRoleName: Record<string, string> = {};
      roles.forEach((r) => (byRoleName[r.name.toLowerCase()] = r.id));

      const toPayload = (m: any) => {
        const department_id = byDeptName[m.department?.toLowerCase?.() || ""];
        const role_id = byRoleName[m.role?.toLowerCase?.() || ""];
        const statusMapped: "active" | "inactive" = m.status === "inactive" || m.status === "inativo" ? "inactive" : "active";
        return {
          company_id: companyId,
          first_name: m.first_name || "",
          last_name: m.last_name || null,
          email: m.email || null,
          cpf_cnpj: m.cpf_cnpj || null,
          registration_number: m.registration_number || null,
          phone: m.phone || null,
          date_of_birth: m.date_of_birth ? parseDate(m.date_of_birth) : null,
          department_id: department_id || null,
          role_id: role_id || null,
          admission_date: m.admission_date ? parseDate(m.admission_date) : null,
          gender: m.gender || null,
          education_level: m.education_level || null,
          status: statusMapped,
          updated_at: new Date().toISOString(),
        } as Partial<Employee>;
      };

      const payload = mapped.map(toPayload).filter((p) => (p.first_name ?? "").trim().length > 0);
      const actives = payload.filter((p) => (p.status ?? "active") === "active");
      const remain = remainingActiveSlots();
      let finalPayload = payload;
      if (Number.isFinite(remain) && actives.length > remain) {
        let allowed = remain as number;
        finalPayload = [] as any[];
        for (const p of payload) {
          if ((p.status ?? "active") === "active") {
            if (allowed > 0) { finalPayload.push(p); allowed--; }
          } else { finalPayload.push(p); }
        }
      }
      const chunk = 200;
      for (let i = 0; i < finalPayload.length; i += chunk) {
        const slice = finalPayload.slice(i, i + chunk);
        const { error } = await supabase.from("employees").insert(slice as any);
        if (error) throw error;
      }
      const { data: emps } = await supabase.from("employees").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      setEmployees((emps as Employee[]) ?? []);
      showSuccess("Importação concluída.");
      setImportOpen(false);
    } catch (err: any) {
      console.error("[Import Wizard] Falha na importação:", err);
      showError(err?.message || "Falha na importação.");
    } finally {
      setIsImporting(false);
    }
  };

  const canAddEmployee = employeesLimit === undefined || activeEmployeesCount < (employeesLimit ?? 0);

  const onlyDigitsLocal = (s: string | null | undefined) => (s || "").replace(/\D/g, "");
  const formatCurrency = (value?: number | null) =>
    typeof value === "number" ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";
  const generateWhatsappLink = (plan: Plan) => {
    const number = onlyDigitsLocal(supportWhatsapp) || onlyDigitsLocal(import.meta.env.VITE_SUPPORT_WHATSAPP as any) || "5582981266172";
    const currentName = currentAssignment?.plans?.name || "N/A";
    const currentLimit = currentAssignment?.plans?.limits?.active_employees ?? null;
    const msg = `Olá! Sou ${partnerName || "parceiro"}. Atingi o limite de colaboradores do plano ${currentName} (limite: ${currentLimit ?? "ilimitado"}, atual: ${activeEmployeesCount}). Gostaria de fazer upgrade para o plano ${plan.name} (limite colaboradores: ${plan.limits?.active_employees ?? "ilimitado"}, preço: ${formatCurrency(plan.total_price)}).`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  // Roles filtered by selected department
  const availableRoles = useMemo(() => {
    if (!departmentId) return roles;
    return roles.filter((r) => r.department_id === departmentId || !r.department_id);
  }, [roles, departmentId]);

  // Helpers
  const resetForm = () => {
    setEditing(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setCpfCnpj("");
    setRegistrationNumber("");
    setPhone("");
    setDateOfBirth("");
    setDepartmentId(undefined);
    setRoleId(undefined);
    setAdmissionDate("");
    setGender(undefined);
    setEducationLevel(undefined);
    setObservations("");
    setStatus("active");
  };

  const normalizeHeader = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, "_");
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [] as any[];
    const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => normalizeHeader(h));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep);
      const obj: any = {};
      headers.forEach((h, idx) => (obj[h] = (parts[idx] ?? "").trim()));
      rows.push(obj);
    }
    return rows;
  };
  const parseDate = (s?: string) => {
    const v = (s || "").trim();
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00").toISOString();
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };
  const onClickImport = () => fileInputRef.current?.click();
  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        showError("CSV vazio ou inválido.");
        return;
      }
      const byDeptName: Record<string, string> = {};
      departments.forEach((d) => (byDeptName[d.name.toLowerCase()] = d.id));
      const byRoleName: Record<string, string> = {};
      roles.forEach((r) => (byRoleName[r.name.toLowerCase()] = r.id));
      const mapVal = (obj: any, keys: string[]) => {
        for (const k of keys) {
          const v = obj[k];
          if (v !== undefined && v !== "") return String(v);
        }
        return "";
      };
      const payload = rows.map((r) => {
        const first_name = mapVal(r, ["first_name", "nome", "primeiro_nome"]);
        const last_name = mapVal(r, ["last_name", "sobrenome"]);
        const email = mapVal(r, ["email", "e_mail"]);
        const cpf_cnpj = mapVal(r, ["cpf_cnpj", "cpf", "cnpj"]);
        const registration_number = mapVal(r, ["registration_number", "matricula", "matrícula"]);
        const phone = mapVal(r, ["phone", "telefone", "celular"]);
        const dob = mapVal(r, ["date_of_birth", "data_nascimento", "nascimento", "data_de_nascimento"]);
        const adm = mapVal(r, ["admission_date", "data_admissao", "admissao", "data_de_admissao"]);
        const deptName = mapVal(r, ["department", "departamento", "setor"]).toLowerCase();
        const roleName = mapVal(r, ["role", "cargo", "funcao", "função"]).toLowerCase();
        const gender = mapVal(r, ["gender", "genero", "gênero"]) || null;
        const education_level = mapVal(r, ["education_level", "escolaridade"]) || null;
        const statusRaw = mapVal(r, ["status"]).toLowerCase();
        const department_id = byDeptName[deptName];
        const role_id = byRoleName[roleName];
        const status: "active" | "inactive" = statusRaw === "inactive" || statusRaw === "inativo" ? "inactive" : "active";
        return {
          company_id: companyId,
          first_name: first_name || "",
          last_name: last_name || null,
          email: email || null,
          cpf_cnpj: cpf_cnpj || null,
          registration_number: registration_number || null,
          phone: phone || null,
          date_of_birth: parseDate(dob),
          department_id: department_id || null,
          role_id: role_id || null,
          admission_date: parseDate(adm),
          gender: gender || null,
          education_level: education_level || null,
          status,
          updated_at: new Date().toISOString(),
        } as Partial<Employee>;
      }).filter((p) => p.first_name);

      const activesInPayload = payload.filter((p) => (p.status ?? "active") === "active");
      const remaining = employeesLimit === undefined ? activesInPayload.length : Math.max(0, (employeesLimit ?? 0) - activeEmployeesCount);
      if (employeesLimit !== undefined && remaining <= 0 && activesInPayload.length > 0) {
        showError("Limite de colaboradores ativos do seu plano foi atingido. Não é possível importar mais colaboradores ativos.");
        return;
      }
      let finalPayload = payload;
      if (employeesLimit !== undefined && activesInPayload.length > remaining) {
        let allowed = remaining;
        finalPayload = [] as any;
        for (const p of payload) {
          if ((p.status ?? "active") === "active") {
            if (allowed > 0) {
              finalPayload.push(p);
              allowed--;
            }
          } else {
            finalPayload.push(p);
          }
        }
        showError(`Importação limitada pelo plano. Apenas ${remaining} colaboradores ativos foram importados.`);
      }
      if (finalPayload.length === 0) {
        showError("Nenhuma linha válida encontrada.");
        return;
      }
      const chunk = 200;
      for (let i = 0; i < finalPayload.length; i += chunk) {
        const slice = finalPayload.slice(i, i + chunk);
        const { error } = await supabase.from("employees").insert(slice as any);
        if (error) {
          console.error("Falha ao importar colaboradores:", error);
          showError(`Erro ao importar: ${error.message}`);
          return;
        }
      }
      const { data: emps } = await supabase.from("employees").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      setEmployees((emps as Employee[]) ?? []);
      showSuccess(`Importação concluída.`);
    } catch (err: any) {
      console.error("Erro na importação de CSV:", err);
      showError("Falha ao processar o CSV.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openCreate = () => {
    if (!canAddEmployee) {
      showError("Limite de colaboradores ativos do seu plano foi atingido.");
      return;
    }
    // Limpa o formulário
    resetForm();
    setStatus("active");
    setAdmissionDate(dateToInputValue(new Date())); // Data de admissão padrão: hoje
    // Seleciona primeiro departamento e cargo compatível, se disponíveis
    const firstDept = departments[0]?.id;
    if (firstDept) {
      setDepartmentId(firstDept);
      const firstRole = roles.find((r) => !r.department_id || r.department_id === firstDept)?.id;
      if (firstRole) setRoleId(firstRole);
    }
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setFirstName(e.first_name ?? "");
    setLastName(e.last_name ?? "");
    setEmail(e.email ?? "");
    setCpfCnpj(e.cpf_cnpj ?? "");
    setRegistrationNumber(e.registration_number ?? "");
    setPhone(e.phone ?? "");
    setDateOfBirth(e.date_of_birth ?? "");
    setDepartmentId(e.department_id ?? undefined);
    setRoleId(e.role_id ?? undefined);
    setAdmissionDate(e.admission_date ?? "");
    setGender(e.gender ?? undefined);
    setEducationLevel(e.education_level ?? undefined);
    setObservations(""); // UI
    setStatus(e.status ?? "active");
    setOpen(true);
  };

  // Save
  const onSave = async () => {
    if (!firstName.trim()) {
      showError("Informe o nome do colaborador.");
      return;
    }

    if (!companyId) {
      showError("Nenhuma empresa selecionada. Selecione a empresa no topo para cadastrar o colaborador.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError("Informe um e-mail válido.");
      return;
    }

    if (email.trim()) {
      const exists = employees.find((e) => e.email?.toLowerCase() === email.trim().toLowerCase() && e.id !== editing?.id);
      if (exists) {
        showError("Este e-mail já está cadastrado neste colaborador.");
        return;
      }
    }

    // Departamento não é mais obrigatório

    // Datas podem ser strings, apenas validações simples
    if (dateOfBirth && dateOfBirth !== "" && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      showError("Data de nascimento não pode ser no futuro.");
      return;
    }
    if (admissionDate && admissionDate !== "" && admissionDate > new Date().toISOString().slice(0, 10)) {
      showError("Data de admissão não pode ser no futuro.");
      return;
    }

    if (roleId && departmentId) {
      const r = availableRoles.find((rr) => rr.id === roleId);
      if (r && r.department_id && r.department_id !== departmentId) {
        showError("Cargo selecionado não pertence ao departamento escolhido.");
        return;
      }
    }

    // Controle de transição de status para validar limites do plano
    const wasActive: boolean = (editing?.status ?? "inactive") === "active";
    const willBeActive: boolean = status === "active";
    if (!wasActive && willBeActive && !canAddEmployee) {
      showError("Limite de colaboradores ativos do seu plano foi atingido.");
      return;
    }

    setIsSaving(true);
    const payload: Partial<Employee> = {
      id: editing?.id,
      company_id: companyId,
      first_name: firstName.trim(),
      last_name: (lastName ?? "").trim() || null,
      email: email.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      registration_number: registrationNumber.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      department_id: departmentId || null,
      role_id: roleId || null,
      admission_date: admissionDate ? new Date(admissionDate).toISOString() : null,
      gender: gender || null,
      education_level: educationLevel || null,
      status: status,
      // Observations já guarda na UI; se desejar, pode salvar como campo adicional
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from("employees").upsert(payload as any).select("*");
      if (error) {
        console.error("[Colaboradores] Não foi possível salvar o colaborador:", error, { payload });
        showError(error.message || "Não foi possível salvar o colaborador.");
        return;
      }
      const saved = (data ?? [])[0] as Employee;
      setEmployees((prev) => {
        const exists = prev.some((x) => x.id === saved.id);
        return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
      });
      // Ajusta contagem de ativos considerando transições
      if (!wasActive && willBeActive) setActiveEmployeesCount((c) => c + 1);
      if (wasActive && !willBeActive) setActiveEmployeesCount((c) => Math.max(0, c - 1));
      setOpen(false);
      resetForm();
      showSuccess(editing ? "Colaborador atualizado." : "Colaborador criado.");
    } catch (err) {
      console.error("Erro ao salvar colaborador:", err);
      showError("Erro ao salvar colaborador.");
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este colaborador?")) return;
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) {
        showError("Falha ao excluir colaborador.");
        return;
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      showSuccess("Colaborador excluído.");
    } catch (err) {
      console.error("Erro ao excluir colaborador:", err);
      showError("Erro ao excluir colaborador.");
    }
  };

  // Render
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Colaboradores</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => { if (!canAddEmployee) { setUpgradeOpen(true); return; } openCreate(); }}
            disabled={loadingLimits}
            className="rounded-full bg-[#0E3A4D] px-4 text-white hover:bg-[#0c2f3e]"
          >
            <Plus className="mr-2 h-4 w-4" />
            {(!canAddEmployee) ? "Fazer Upgrade" : "Adicionar Colaborador"}
          </Button>
          <Button variant="outline" onClick={startImportWizard} disabled={isImporting || !canAddEmployee || loadingLimits}>
            {isImporting ? "Importando..." : "Importar CSV"}
          </Button>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setObservations(""); } }}>
          <DialogContent className="w-full max-w-[750px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Colaborador" : "Cadastrar Colaborador"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Nome</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10" placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Sobrenome</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10" placeholder="Sobrenome" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">E-mail</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" placeholder="email@empresa.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">CPF/CNPJ</label>
                  <Input
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatCPF(e.target.value))}
                    className="h-10"
                    placeholder="CPF ou CNPJ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Matrícula</label>
                  <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="h-10" placeholder="Matrícula" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Telefone</label>
                  <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="h-10" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-10 rounded border w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Data de Admissão</label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="h-10 rounded border w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Depto</label>
                  <Select value={departmentId ?? ""} onValueChange={(v) => {
                    setDepartmentId(v || undefined);
                    if (roleId) {
                      const r = roles.find((ro) => ro.id === roleId);
                      if (!r || (r as any).department_id !== v) {
                        setRoleId(undefined);
                      }
                    }
                  }}>
                    <SelectTrigger className="h-10 rounded" >
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Cargo</label>
                  <Select value={roleId ?? ""} onValueChange={setRoleId} disabled={!departmentId}>
                    <SelectTrigger className="h-10 rounded">
                      <SelectValue placeholder={departmentId ? (availableRoles.length ? "Selecione o cargo" : "Nenhum cargo") : "Selecione o dept."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Gênero</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-10 rounded">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="nao-binario">Não binário</SelectItem>
                      <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block mb-1">Escolaridade</label>
                  <Select value={educationLevel ?? ""} onValueChange={setEducationLevel}>
                    <SelectTrigger className="h-10 rounded">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental">Fundamental</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="superior">Superior</SelectItem>
                      <SelectItem value="pos">Pós-graduação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium block mb-1">Observações</label>
                  <Textarea placeholder="Observações opcionais" value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="h-28 rounded-xl w-full" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : (editing ? "Salvar alterações" : "Cadastrar Colaborador")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#1B365D] hover:bg-[#1B365D] text-white cursor-default">
              <TableHead className="text-white first:rounded-tl-xl">Nome</TableHead>
              <TableHead className="text-white">E-mail</TableHead>
              <TableHead className="text-white">CPF/CNPJ</TableHead>
              <TableHead className="text-white">Matrícula</TableHead>
              <TableHead className="text-white">Setor</TableHead>
              <TableHead className="text-white">Cargo</TableHead>
              <TableHead className="text-white">Data Nasc</TableHead>
              <TableHead className="text-white">Admissão</TableHead>
              <TableHead className="text-white text-right last:rounded-tr-xl">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{[e.first_name, e.last_name].filter(Boolean).join(" ")}</TableCell>
                <TableCell>{e.email ?? "-"}</TableCell>
                <TableCell>{e.cpf_cnpj ?? "—"}</TableCell>
                <TableCell>{e.registration_number ?? "—"}</TableCell>
                <TableCell>{e.department_id ? departments.find((d) => d.id === e.department_id)?.name : "—"}</TableCell>
                <TableCell>{e.role_id ? roles.find((r) => r.id === e.role_id)?.name : "—"}</TableCell>
                <TableCell>{e.date_of_birth ? new Date(e.date_of_birth).toLocaleDateString() : "—"}</TableCell>
                <TableCell>{e.admission_date ? new Date(e.admission_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(e.id)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  Nenhum colaborador encontrado para esta empresa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Upgrade dialog when employee limit reached */}
      <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite de colaboradores atingido</AlertDialogTitle>
            <AlertDialogDescription>
              Seu plano atual ({currentAssignment?.plans?.name || "N/A"}) permite {currentAssignment?.plans?.limits?.active_employees ?? "∞"} colaboradores ativos. Você já possui {activeEmployeesCount}. Para cadastrar novos colaboradores, faça upgrade do plano.
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
                      Limite de colaboradores: {p.limits?.active_employees ?? "∞"} • {formatCurrency(p.total_price)}/mês
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

      {/* Import Wizard */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportStep(1); setImportRows([]); } }}>
        <DialogContent className="w-full max-w-[820px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Colaboradores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Steps indicator */}
            <div className="flex items-center gap-3 text-sm">
              <div className={`rounded-full px-2 py-0.5 ${importStep===1?"bg-[#0E3A4D] text-white":"bg-zinc-200"}`}>1</div>
              <span>Start</span>
              <div className="h-px flex-1 bg-zinc-200" />
              <div className={`rounded-full px-2 py-0.5 ${importStep===2?"bg-[#0E3A4D] text-white":"bg-zinc-200"}`}>2</div>
              <span>Upload</span>
              <div className="h-px flex-1 bg-zinc-200" />
              <div className={`rounded-full px-2 py-0.5 ${importStep===3?"bg-[#0E3A4D] text-white":"bg-zinc-200"}`}>3</div>
              <span>Map</span>
              <div className="h-px flex-1 bg-zinc-200" />
              <div className={`rounded-full px-2 py-0.5 ${importStep===4?"bg-[#0E3A4D] text-white":"bg-zinc-200"}`}>4</div>
              <span>Verify</span>
            </div>

            {importStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Selecione um arquivo CSV para importar colaboradores. Baixe um modelo para referência.</p>
                <div className="rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-700">
                  <div>
                    <span className="font-medium">Limite do plano (colaboradores ativos):</span>
                    {" "}{currentAssignment?.plans?.limits?.active_employees ?? "∞"}
                  </div>
                  <div>
                    <span className="font-medium">Ativos atuais:</span> {activeEmployeesCount}
                  </div>
                  <div>
                    <span className="font-medium">Restantes para importar como ativos agora:</span> {Number.isFinite(remainingActiveSlots()) ? remainingActiveSlots() : "∞"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => downloadFile(getSampleCsv(), 'modelo_colaboradores.csv', 'text/csv')}>Baixar modelo CSV</Button>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setImportStep(2)}>Começar</Button>
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="border-dashed border rounded-xl p-8 text-center">
                  <input type="file" accept=".csv,text/csv" onChange={handleUploadFile} />
                  {importFileName && <div className="mt-2 text-sm">Arquivo: {importFileName}</div>}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setImportStep(1)}>Voltar</Button>
                  <Button onClick={() => setImportStep(3)} disabled={!importRows.length}>Avançar</Button>
                </div>
              </div>
            )}

            {importStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm">Mapeie as colunas do arquivo para os campos:</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(headerMap).map((k) => (
                    <div key={k} className="space-y-1">
                      <div className="text-xs font-medium">{k}</div>
                      <Select value={headerMap[k]} onValueChange={(v) => setHeaderMap((m) => ({...m, [k]: v}))}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione a coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          {importHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setImportStep(2)}>Voltar</Button>
                  <Button onClick={() => setImportStep(4)} disabled={!headerMap.first_name}>Avançar</Button>
                </div>
              </div>
            )}

            {importStep === 4 && (
              <div className="space-y-4">
                <div className="text-sm">
                  <div>Total de linhas: {importRows.length}</div>
                  <div>Colaboradores ativos permitidos restantes: {Number.isFinite(remainingActiveSlots()) ? remainingActiveSlots() : "∞"}</div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setImportStep(3)}>Voltar</Button>
                  <Button onClick={confirmImportFromWizard} disabled={isImporting || (!Number.isFinite(remainingActiveSlots()) ? false : remainingActiveSlots() === 0)}>Importar</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Upgrade dialog similar ao de Empresas
// Inserido antes do export por estar incluso no JSX acima

export default Colaboradores;