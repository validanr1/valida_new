import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { partner_id, operation } = await req.json(); // operation: 'increment' | 'decrement'

    if (!partner_id || !operation) {
      return new Response(JSON.stringify({ error: "Missing partner_id or operation." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch current usage counter
    const { data: usageCounter, error: usageError } = await supabaseAdmin
      .from("usage_counters")
      .select("id, companies_count")
      .eq("partner_id", partner_id)
      .maybeSingle();

    if (usageError) {
      console.error("update-company-count: Error fetching usage_counters:", usageError);
      throw usageError;
    }

    let newCompaniesCount = usageCounter?.companies_count || 0;

    if (operation === 'increment') {
      newCompaniesCount++;
    } else if (operation === 'decrement') {
      newCompaniesCount = Math.max(0, newCompaniesCount - 1); // Ensure count doesn't go below zero
    } else {
      return new Response(JSON.stringify({ error: "Invalid operation. Must be 'increment' or 'decrement'." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from("usage_counters")
      .upsert({
        partner_id: partner_id,
        companies_count: newCompaniesCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'partner_id' });

    if (upsertError) {
      console.error("update-company-count: Error upserting usage_counters:", upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ message: `Company count ${operation}ed successfully. New count: ${newCompaniesCount}` }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      },
    );
  } catch (error) {
    console.error("update-company-count: Unexpected error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});