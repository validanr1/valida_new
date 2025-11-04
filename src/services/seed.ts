import { getCollection, setCollection, upsert, markSeeded, isSeeded, nowISO } from "./storage";

export async function ensureSeeded() {
  if (isSeeded()) return;

  // Users
  const users = [
    {
      id: "user_admin",
      email: "admin@validanr1.com",
      password: "senha",
      name: "Super Admin",
      roleGlobal: "SuperAdmin",
      created_at: nowISO(),
      updated_at: nowISO(),
    },
    {
      id: "user_partner",
      email: "partner@alpha.com",
      password: "senha",
      name: "Partner Admin",
      roleGlobal: "User",
      partner_id: "partner_alpha",
      rolePartner: "PartnerAdmin",
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  setCollection("users", users);

  // Partner
  const partners = [
    {
      id: "partner_alpha",
      name: "Consultoria Alpha",
      theme: { primary: "#1DB584", secondary: "#1B365D" },
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  setCollection("partners", partners);

  // Plans
  const plans = [
    {
      id: "plan_starter",
      name: "Starter",
      limits: { companies: 2, active_employees: 200, active_assessments: 1 },
      created_at: nowISO(),
      updated_at: nowISO(),
    },
    {
      id: "plan_pro",
      name: "Pro",
      limits: { companies: 10, active_employees: 1500, active_assessments: 5 },
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  setCollection("plans", plans);

  const planAssignments = [
    {
      id: "assign_alpha",
      partner_id: "partner_alpha",
      plan_id: "plan_starter",
      active_from: nowISO(),
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  setCollection("planAssignments", planAssignments);

  // Companies
  const companies = [
    {
      id: "comp_limp",
      partner_id: "partner_alpha",
      name: "EMPRESA DE LIMPEZA URBANA",
      city: "São Paulo",
      created_at: nowISO(),
      updated_at: nowISO(),
    },
    {
      id: "comp_const",
      partner_id: "partner_alpha",
      name: "CONSTRUCAO CIVIL LTDA",
      city: "Belo Horizonte",
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  setCollection("companies", companies);

  // Employees (um pouco de demo)
  const employees = Array.from({ length: 20 }).map((_, idx) => ({
    id: `emp_${idx + 1}`,
    company_id: idx % 2 === 0 ? "comp_limp" : "comp_const",
    first_name: idx % 2 === 0 ? "Ana" : "Diego",
    last_name: `Demo ${idx + 1}`,
    email: `demo${idx + 1}@example.com`,
    status: "active",
    created_at: nowISO(),
    updated_at: nowISO(),
  }));
  setCollection("employees", employees);

  // Partner Members (ligação user-partner)
  const partnerMembers = [
    { id: "pm_1", user_id: "user_partner", partner_id: "partner_alpha", role: "PartnerAdmin", created_at: nowISO(), updated_at: nowISO() },
  ];
  setCollection("partnerMembers", partnerMembers);

  // Usage counters (opcional por enquanto)
  setCollection("usageCounters", [
    {
      id: "uc_alpha",
      partner_id: "partner_alpha",
      companies_count: companies.length,
      active_employees_count: employees.length,
      active_assessments_count: 0,
      updated_at: nowISO(),
    },
  ]);

  // Audit logs básico
  setCollection("auditLogs", [
    {
      id: "log_seed",
      action: "seed",
      entity: "system",
      created_at: nowISO(),
      payload_json: { note: "Initial seed" },
    },
  ]);

  markSeeded();

  // Garantir collections vazias existam
  const ensureEmpty = ["templates", "assessments", "reports", "billingRequests"] as const;
  ensureEmpty.forEach((c) => {
    const any = getCollection<any>(c as any);
    if (!any) setCollection(c as any, []);
  });
}

export function getPartnerPlanLimits(partner_id: string) {
  const assigns = getCollection<any>("planAssignments");
  const plans = getCollection<any>("plans");
  const assign = assigns.find((a) => a.partner_id === partner_id);
  if (!assign) return null;
  const plan = plans.find((p) => p.id === assign.plan_id);
  return plan?.limits ?? null;
}