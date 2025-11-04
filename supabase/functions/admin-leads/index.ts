import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAIL_PROVIDER = (Deno.env.get("EMAIL_PROVIDER") || "").toLowerCase();
const EMAIL_API_KEY = Deno.env.get("EMAIL_API_KEY") || "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "";
const AUTH_USE_INVITE = (Deno.env.get("AUTH_USE_INVITE") || "true").toLowerCase() !== "false";
const LOGIN_URL = Deno.env.get("LOGIN_URL") || "";
const LEADS_NOTIFY_EMAIL = Deno.env.get("LEADS_NOTIFY_EMAIL") || "";

// Helper para envio via Resend com tratamento de erro padronizado
const canSendEmail = EMAIL_PROVIDER === 'resend' && !!EMAIL_API_KEY && !!EMAIL_FROM;
async function sendResendEmail(to: string[], subject: string, html: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    console.error("[admin-leads] resend email failed:", resp.status, errTxt);
  }
}

// Validação de configuração (log único na inicialização)
if (EMAIL_PROVIDER === 'resend' && (!EMAIL_API_KEY || !EMAIL_FROM)) {
  console.warn('[admin-leads] Resend configurado, mas faltam envs:', {
    EMAIL_API_KEY: !!EMAIL_API_KEY,
    EMAIL_FROM: !!EMAIL_FROM,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    if (req.method === "GET") {
      // Protected: require auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
      const url = new URL(req.url);
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

      const { data, error } = await sbAdmin
        .from("partner_leads")
        .select("id,name,email,phone_whatsapp,company,status,created_at,plan_id, plans(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(limit) as any;
      if (error) throw error;

      const items = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone_whatsapp: row.phone_whatsapp,
        company: row.company,
        status: row.status,
        created_at: row.created_at,
        plan_id: row.plan_id,
        plan_name: row.plans?.name ?? null,
      }));

      return json({ items });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({} as any));
      const action = (body?.action || "").toString();
      if (action === "notify_new_lead") {
        // Public action: notify internal team about a new lead (MVP via secret)
        try {
          const toEmail = LEADS_NOTIFY_EMAIL;
          if (!toEmail) return json({ ok: true }); // nothing to notify

          const leadName = (body?.name || "").toString();
          const leadEmail = (body?.email || "").toString();
          const leadPhone = (body?.phone_whatsapp || "").toString();
          const planName = (body?.plan_name || body?.plan_id || "-").toString();
          const subject = `Novo lead: ${leadName || leadEmail} — ${planName}`;
          const html = `
            <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111">
              <p><strong>Novo Lead Recebido</strong></p>
              <p><strong>Nome:</strong> ${leadName || "-"}</p>
              <p><strong>E-mail:</strong> ${leadEmail || "-"}</p>
              <p><strong>WhatsApp:</strong> ${leadPhone || "-"}</p>
              <p><strong>Plano:</strong> ${planName || "-"}</p>
              <p style="margin-top:16px">Valida NR1</p>
            </div>`;

          if (canSendEmail) {
            await sendResendEmail([toEmail], subject, html);
            console.log('[admin-leads] notify_new_lead sent to', toEmail);
          } else {
            console.warn('[admin-leads] Email não enviado: Resend sem configuração completa (EMAIL_API_KEY/EMAIL_FROM).');
          }
        } catch (e) {
          console.error("[admin-leads] notify_new_lead exception:", e);
        }
        return json({ ok: true });
      }

      if (action === "update_lead") {
        // Protected: require auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json({ error: "Unauthorized" }, 401);
        const token = authHeader.replace("Bearer ", "");
        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

        const leadId = (body?.lead_id || "").toString();
        if (!leadId) return json({ error: "lead_id is required" }, 400);
        const payload: any = {};
        if (body?.name !== undefined) payload.name = String(body.name);
        if (body?.email !== undefined) payload.email = String(body.email);
        if (body?.phone_whatsapp !== undefined) payload.phone_whatsapp = String(body.phone_whatsapp);
        if (body?.company !== undefined) payload.company = body.company ? String(body.company) : null;
        if (body?.status !== undefined) payload.status = String(body.status);
        if (body?.plan_id !== undefined) payload.plan_id = body.plan_id || null;
        if (Object.keys(payload).length === 0) return json({ error: "nothing to update" }, 400);

        const { error: upErr } = await sbAdmin.from("partner_leads").update(payload).eq("id", leadId);
        if (upErr) throw upErr;
        try {
          await sbAdmin.from("lead_events").insert({
            lead_id: leadId,
            action: "update",
            details: payload,
          } as any);
        } catch (e) { console.warn("[admin-leads] failed to log lead_events update", e); }
        return json({ ok: true });
      }

      if (action === "delete_lead") {
        // Protected: require auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json({ error: "Unauthorized" }, 401);
        const token = authHeader.replace("Bearer ", "");
        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });
        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

        const leadId = (body?.lead_id || "").toString();
        if (!leadId) return json({ error: "lead_id is required" }, 400);
        // Ensure it's deletable only when status = 'new'
        const { data: current, error: curErr } = await sbAdmin
          .from("partner_leads")
          .select("status")
          .eq("id", leadId)
          .maybeSingle();
        if (curErr || !current) return json({ error: "Lead not found" }, 404);
        if (String(current.status) !== "new") return json({ error: "Only leads with status 'new' can be deleted" }, 400);

        const { error: delErr } = await sbAdmin.from("partner_leads").delete().eq("id", leadId);
        if (delErr) throw delErr;
        try { await sbAdmin.from("lead_events").insert({ lead_id: leadId, action: "delete" } as any); } catch {}
        return json({ ok: true });
      }

      if (action !== "convert") return json({ error: "Bad Request" }, 400);

      // Protected: require auth for convert
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

      const leadId = (body?.lead_id || "").toString();
      const partnerName = (body?.partner_name || "").toString();
      const planId = (body?.plan_id || "").toString() || null;
      if (!leadId) return json({ error: "lead_id is required" }, 400);

      // Load lead
      const { data: lead, error: leadErr } = await sbAdmin
        .from("partner_leads")
        .select("id,name,email,company,phone_whatsapp,plan_id,status,created_at")
        .eq("id", leadId)
        .maybeSingle();
      if (leadErr || !lead) return json({ error: "Lead not found" }, 404);

      // Basic validation
      const finalPartnerName = partnerName || lead.company || lead.name;
      if (!finalPartnerName) return json({ error: "partner_name required" }, 400);

      // Resolve final plan id and fetch plan name (for email)
      const finalPlanId = (planId || lead.plan_id) ?? null;
      let planName: string | null = null;
      if (finalPlanId) {
        try {
          const { data: p, error: pErr } = await sbAdmin
            .from('plans')
            .select('name')
            .eq('id', finalPlanId)
            .maybeSingle();
          if (!pErr && p?.name) planName = String(p.name);
        } catch {}
      }

      // Create partner from lead
      const { data: partner, error: partnerErr } = await sbAdmin
        .from("partners")
        .insert({
          name: finalPartnerName,
          status: "pending",
          plan_id: finalPlanId,
          responsible_name: lead.name ?? null,
          responsible_email: lead.email ?? null,
          responsible_phone: lead.phone_whatsapp ?? null,
        } as any)
        .select("id,name,status,plan_id")
        .single();
      if (partnerErr || !partner) throw partnerErr;

      // Mark lead as approved (or contacted)
      const { error: updErr } = await sbAdmin
        .from("partner_leads")
        .update({ status: "approved" } as any)
        .eq("id", leadId);
      if (updErr) throw updErr;

      // Log event: convert
      try {
        await sbAdmin.from("lead_events").insert({
          lead_id: leadId,
          action: "convert",
          details: { partner_id: partner.id, partner_name: finalPartnerName },
        } as any);
      } catch (e) {
        console.warn("[admin-leads] failed to log lead_events convert", e);
      }

      // Do NOT create auth user here. Manual activation happens later in admin-partners.
      // Send informational email to lead: cadastro em análise (with plan name if available)
      try {
        if (canSendEmail && lead.email) {
          const subject = planName
            ? `Recebemos sua solicitação — ${finalPartnerName} • Plano ${planName}`
            : `Recebemos sua solicitação — ${finalPartnerName}`;
          const html = `
            <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111">
              <p>Olá, ${lead.name || finalPartnerName}!</p>
              <p>Seu cadastro foi recebido e está em análise. Em breve entraremos em contato com as próximas etapas.</p>
              ${planName ? `<p><strong>Plano selecionado:</strong> ${planName}</p>` : ''}
              <p style="margin-top:16px">Atenciosamente,<br/>Equipe Valida NR1</p>
            </div>`;
          await sendResendEmail([lead.email], subject, html);
        } else {
          console.warn('[admin-leads] Email não enviado: Resend sem configuração completa ou lead sem e-mail.');
        }
      } catch (e) {
        console.warn('[admin-leads] analysis email exception:', e);
      }

      return json({ ok: true, partner_id: partner.id });
    }

    return json({ error: "Method Not Allowed" }, 405);
  } catch (err) {
    console.error("admin-leads: error", err);
    return json({ error: (err as Error).message ?? "Internal Server Error" }, 500);
  }
});
