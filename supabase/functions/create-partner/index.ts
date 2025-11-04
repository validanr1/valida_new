import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use the Service Role Key for admin-level operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { partner, planId } = await req.json()

    if (!partner || !planId || !partner.responsibleEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    // Fetch PartnerAdmin role ID
    const { data: partnerAdminRole, error: roleError } = await supabaseAdmin
      .from("role_profiles")
      .select("id")
      .eq("name", "PartnerAdmin")
      .eq("target", "partner")
      .maybeSingle();

    if (roleError || !partnerAdminRole) {
      console.error("create-partner: PartnerAdmin role profile not found or error:", roleError);
      throw new Error("PartnerAdmin role profile not found.");
    }
    const partnerAdminRoleId = partnerAdminRole.id;
    console.log("create-partner: Fetched PartnerAdmin Role ID:", partnerAdminRoleId);

    // Split responsibleName into first_name and last_name (best-effort)
    const splitName = (full: string | undefined | null) => {
      const raw = (full || '').trim();
      if (!raw) return { first_name: null as string | null, last_name: null as string | null };
      const parts = raw.split(/\s+/);
      if (parts.length === 1) return { first_name: parts[0], last_name: null };
      const first = parts.shift()!;
      const last = parts.join(' ') || null;
      return { first_name: first, last_name: last };
    };

    // Prefer explicit first/last from payload, fallback to split of responsibleName
    let first_name = (partner.responsibleFirstName ?? '').trim() || null;
    let last_name = (partner.responsibleLastName ?? '').trim() || null;
    if (!first_name && !last_name) {
      const s = splitName(partner.responsibleName);
      first_name = s.first_name;
      last_name = s.last_name;
    }
    const combinedResponsibleName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || (partner.responsibleName || '').trim();

    const userMetadata = {
      first_name,
      last_name,
      role_profile_id: partnerAdminRoleId, // Pass PartnerAdmin role ID
      is_setup_master: false, // Explicitly set to false for partner users
    };
    
    // 1. Invite the user by email. Supabase will send an email with a link to set their password.
    const platformLink = Deno.env.get("SITE_URL") + "/auth/callback"; // Link para a página de callback que redireciona para set-password

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      partner.responsibleEmail,
      {
        data: userMetadata,
        redirectTo: platformLink,
      }
    );

    if (authError) throw authError
    if (!authData.user) throw new Error("Failed to invite user.");
    const newUser = authData.user;

    // 2. Create the partner record
    const { data: partnerData, error: partnerError } = await supabaseAdmin
      .from("partners")
      .insert({
        name: partner.name,
        responsible_name: combinedResponsibleName,
        responsible_email: partner.responsibleEmail,
        responsible_phone: partner.responsiblePhone,
        status: partner.status,
      })
      .select()
      .single()

    if (partnerError) throw partnerError

    // 3. Link user to partner in partner_members
    const { error: memberError } = await supabaseAdmin
      .from("partner_members")
      .insert({ user_id: newUser.id, partner_id: partnerData.id, role: "PartnerAdmin" })

    if (memberError) throw memberError

    // Ensure public.profiles exists with names and role profile
    const { error: upsertProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.id,
        first_name,
        last_name,
        role_profile_id: partnerAdminRoleId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (upsertProfileError) {
      console.error("create-partner: Error upserting public.profiles:", upsertProfileError);
      throw new Error("Failed to upsert user profile with name and role_profile_id.");
    }
    console.log("create-partner: Upserted public.profiles with name and role_profile_id for user:", newUser.id);


    // 4. Assign the plan
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from("plan_assignments")
      .insert({ partner_id: partnerData.id, plan_id: planId, active_from: new Date().toISOString() }) // Set active_from
      .select()
      .single()

    if (assignmentError) throw assignmentError

    // 5. Fetch plan details to create subscription and invoice
    const { data: planDetails, error: planDetailsError } = await supabaseAdmin
      .from("plans")
      .select("name, period, total_price")
      .eq("id", planId)
      .maybeSingle();

    if (planDetailsError || !planDetails) {
      console.error("create-partner: Plan details not found or error:", planDetailsError);
      throw new Error("Plan details not found for subscription creation.");
    }

    const now = new Date();
    const startedAt = now.toISOString();
    let endsAt: string | null = null;

    // Calculate ends_at based on plan period
    const nextDate = new Date(now);
    switch (planDetails.period) {
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    endsAt = nextDate.toISOString();

    // 6. Create initial subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        partner_id: partnerData.id,
        plan_id: planId,
        status: "active",
        period: planDetails.period,
        price: planDetails.total_price,
        started_at: startedAt,
        ends_at: endsAt,
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // 7. Create initial invoice
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 30); // Due in 30 days
    
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        subscription_id: subscriptionData.id,
        partner_id: partnerData.id,
        amount: planDetails.total_price,
        currency: "BRL",
        status: "open",
        due_date: dueDate.toISOString().split('T')[0], // Only date part
        issued_at: now.toISOString(),
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // A função `inviteUserByEmail` já envia um e-mail.
    // Se você quiser um e-mail de boas-vindas *adicional* após o usuário definir a senha,
    // isso precisaria ser implementado em um fluxo separado (ex: um trigger no Supabase
    // quando o usuário atualiza a senha pela primeira vez, ou um e-mail enviado
    // após o primeiro login bem-sucedido).
    // Por enquanto, removemos a invocação do `send-email` aqui para evitar duplicidade e o envio da senha.

    // Return all created data
    return new Response(
      JSON.stringify({
        partner: partnerData,
        assignment: assignmentData,
        subscription: subscriptionData,
        invoice: invoiceData,
        message: "Parceiro criado e convite enviado por e-mail.",
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Error creating partner:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})