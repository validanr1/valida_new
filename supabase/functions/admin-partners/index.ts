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
const LOGIN_URL = Deno.env.get("LOGIN_URL") || "";

// Helper para envio via Resend com tratamento padronizado
const canSendEmail = EMAIL_PROVIDER === 'resend' && !!EMAIL_API_KEY && !!EMAIL_FROM;
async function sendResendEmail(to: string[], subject: string, html: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    console.error('[admin-partners] resend email failed:', resp.status, errTxt);
  }
}

// Validação de configuração (log único na inicialização)
if (EMAIL_PROVIDER === 'resend' && (!EMAIL_API_KEY || !EMAIL_FROM)) {
  console.warn('[admin-partners] Resend configurado, mas faltam envs:', {
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
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "activate_partner") {
      const partner_id = String(body?.partner_id || "");
      if (!partner_id) return json({ error: "partner_id is required" }, 400);

      // Load partner
      const { data: partner, error: pErr } = await sbAdmin
        .from("partners")
        .select("id,name,responsible_name,responsible_email,responsible_phone,status")
        .eq("id", partner_id)
        .maybeSingle();
      if (pErr || !partner) return json({ error: "Partner not found" }, 404);

      const email = partner.responsible_email as string | null;
      const name = (partner.responsible_name as string | null) || partner.name || "Parceiro";
      if (!email) return json({ error: "Partner has no responsible_email" }, 400);

      // Generate temp password and create auth user if not exists
      const genPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?-';
        let out = '';
        for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      };

      let tempPassword = genPassword();
      try {
        const existing = await (sbAdmin as any).auth.admin.listUsers({ page: 1, perPage: 1, email });
        const already = existing?.data?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!already) {
          const created = await (sbAdmin as any).auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { partner_id, name },
          });
          if (created?.error) {
            console.error('[admin-partners] createUser error:', created.error);
          } else {
            console.log('[admin-partners] user ensured for', email);
          }
        } else {
          // If user exists, generate a fresh temp password and update
          const updated = await (sbAdmin as any).auth.admin.updateUserById(already.id, { password: tempPassword });
          if (updated?.error) console.warn('[admin-partners] updateUser password error:', updated.error);
        }
      } catch (e) {
        console.warn('[admin-partners] ensure user failed:', e);
      }

      // Update partner status to active
      const { error: upErr } = await sbAdmin.from('partners').update({ status: 'active' } as any).eq('id', partner_id);
      if (upErr) return json({ error: upErr.message || 'Failed to activate partner' }, 500);

      // Send access email via Resend
      try {
        const loginLink = LOGIN_URL || `${new URL(req.url).origin}`;
        const subject = `Acesso liberado — ${partner.name}`;
        const html = `
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111">
            <p>Olá, ${name}!</p>
            <p>Seu acesso foi liberado. Use as credenciais abaixo para entrar e trocar sua senha:</p>
            <p><strong>Login:</strong> ${email}</p>
            <p><strong>Senha temporária:</strong> ${tempPassword}</p>
            <p style="margin-top:12px"><a href="${loginLink}" style="background:#0B2D4D;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Acessar o sistema</a></p>
            <p style="margin-top:16px">Atenciosamente,<br/>Equipe Valida NR1</p>
          </div>`;
        if (canSendEmail) {
          await sendResendEmail([email], subject, html);
        } else {
          console.warn('[admin-partners] Email não enviado: Resend sem configuração completa (EMAIL_API_KEY/EMAIL_FROM).');
        }
      } catch (e) {
        console.warn('[admin-partners] send email exception:', e);
      }

      return json({ ok: true });
    }

    if (action === "suspend_partner") {
      const partner_id = String(body?.partner_id || "");
      if (!partner_id) return json({ error: "partner_id is required" }, 400);
      const { data: partner, error: pErr } = await sbAdmin
        .from('partners')
        .select('id,name,responsible_email,responsible_name')
        .eq('id', partner_id)
        .maybeSingle();
      if (pErr || !partner) return json({ error: 'Partner not found' }, 404);

      const { error: upErr } = await sbAdmin.from('partners').update({ status: 'suspended' } as any).eq('id', partner_id);
      if (upErr) return json({ error: upErr.message || 'Failed to suspend partner' }, 500);

      // Banir todos os usuários associados ao parceiro para garantir bloqueio de acesso
      try {
        const { data: members, error: memErr } = await sbAdmin
          .from('partner_members')
          .select('user_id')
          .eq('partner_id', partner_id);
        if (memErr) {
          console.warn('[admin-partners] Failed to fetch partner_members for suspension:', memErr);
        } else if (members && members.length > 0) {
          for (const m of members as any[]) {
            const uid = m.user_id as string;
            try {
              const res = await (sbAdmin as any).auth.admin.updateUserById(uid, { banned_until: '2999-01-01T00:00:00Z' });
              if (res?.error) {
                console.warn('[admin-partners] updateUserById banned_until error:', res.error);
              }
            } catch (e) {
              console.warn('[admin-partners] Exception banning user:', uid, e);
            }
          }
        }
      } catch (e) {
        console.warn('[admin-partners] suspension ban users exception:', e);
      }

      try {
        const email = partner.responsible_email as string | null;
        const name = (partner.responsible_name as string | null) || partner.name || 'Parceiro';
        if (canSendEmail && email) {
          const subject = `Acesso suspenso — ${partner.name}`;
          const html = `
            <div style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111">
              <p>Olá, ${name}!</p>
              <p>Seu acesso foi suspenso. Caso acredite ser um engano, entre em contato com o suporte.</p>
              <p style="margin-top:16px">Atenciosamente,<br/>Equipe Valida NR1</p>
            </div>`;
          await sendResendEmail([email], subject, html);
        } else {
          console.warn('[admin-partners] Email não enviado: Resend sem configuração completa ou parceiro sem e-mail.');
        }
      } catch (e) {
        console.warn('[admin-partners] suspension email exception:', e);
      }

      return json({ ok: true });
    }

    if (action === 'get_responsible_name') {
      const partner_id = String(body?.partner_id || '');
      if (!partner_id) return json({ error: 'partner_id is required' }, 400);
      const { data: member, error: memErr } = await sbAdmin
        .from('partner_members')
        .select('user_id')
        .eq('partner_id', partner_id)
        .maybeSingle();
      if (memErr) return json({ error: memErr.message || 'Failed to load partner member' }, 500);
      const user_id = (member as any)?.user_id as string | undefined;
      if (!user_id) return json({ error: 'No member found for this partner' }, 404);
      const { data: profile, error: profErr } = await sbAdmin
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', user_id)
        .maybeSingle();
      if (profErr) return json({ error: profErr.message || 'Failed to load profile' }, 500);
      return json({ ok: true, first_name: (profile as any)?.first_name ?? null, last_name: (profile as any)?.last_name ?? null });
    }

    return json({ error: "Bad Request" }, 400);
  } catch (err) {
    console.error('admin-partners: error', err);
    return json({ error: (err as Error).message ?? 'Internal Server Error' }, 500);
  }
});
