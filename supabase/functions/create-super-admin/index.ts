import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { email, password, firstName, lastName } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    // Fetch SuperAdmin role ID
    const { data: superAdminRole, error: roleError } = await supabaseAdmin
      .from("role_profiles")
      .select("id")
      .eq("name", "SuperAdmin")
      .eq("target", "admin")
      .maybeSingle();

    if (roleError || !superAdminRole) {
      throw new Error("SuperAdmin role profile not found. Please ensure it exists in public.role_profiles.");
    }
    const superAdminRoleId = superAdminRole.id;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        role_profile_id: superAdminRoleId,
        is_setup_master: true, // Flag for handle_new_user trigger
      },
    })

    if (authError) throw authError
    const newUser = authData.user

    // The handle_new_user trigger should automatically create the profile with role_profile_id
    // No need to manually insert into public.profiles here.

    return new Response(
      JSON.stringify({ message: "Super Admin user created successfully.", userId: newUser.id }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Error creating Super Admin user:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})