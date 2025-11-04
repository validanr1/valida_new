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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    // Validate token by calling getUser on anon client with token
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Parse request body
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const resource = (body?.resource as string) || new URL(req.url).searchParams.get("resource") || "assessment_types";

    switch (resource) {
      case "assessment_types": {
        const { data, error } = await sbAdmin
          .from("assessment_types")
          .select("id,name,status")
          .eq("status", "active")
          .order("name", { ascending: true });
        if (error) throw error;
        return json({ items: data ?? [] });
      }
      case "risk_grades": {
        const { data, error } = await sbAdmin
          .from("risk_grades")
          .select("id,name,status")
          .eq("status", "active")
          .order("name", { ascending: true });
        if (error) throw error;
        return json({ items: data ?? [] });
      }
      default:
        return json({ error: "Not Found" }, 404);
    }
  } catch (err) {
    console.error("catalogs: error", err);
    return json({ error: (err as Error).message ?? "Internal Server Error" }, 500);
  }
});
