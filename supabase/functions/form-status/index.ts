import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const partnerId = url.searchParams.get("partner_id");
    const type = url.searchParams.get("type"); // "evaluation" | "denunciation"

    if (!partnerId || !type) {
      console.warn("form-status: Missing partner_id or type in searchParams. Falling back to enabled: true.");
      return new Response(JSON.stringify({ enabled: true, note: "fallback_missing_params" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from("forms")
      .select("enabled")
      .eq("partner_id", partnerId)
      .eq("type", type)
      .maybeSingle();

    if (error) {
      console.error("form-status error:", error);
      return new Response(JSON.stringify({ enabled: true, note: "fallback_enabled_due_error" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const enabled = data?.enabled ?? true;
    return new Response(JSON.stringify({ enabled }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("form-status unexpected error:", err);
    return new Response(JSON.stringify({ enabled: true, note: "fallback_enabled_due_exception" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});