import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Payload recebido:", { 
      type: body.type, 
      hasSubject: !!body.subject, 
      hasBodyHtml: !!body.body_html,
      variablesLength: body.variables?.length 
    });

    const { type, subject, body_html, variables, is_active } = body;

    // Validar dados
    if (!type) {
      throw new Error("Campo 'type' é obrigatório");
    }
    if (!subject) {
      throw new Error("Campo 'subject' é obrigatório");
    }
    if (!body_html) {
      throw new Error("Campo 'body_html' é obrigatório");
    }

    console.log("Salvando template com SQL direto...");

    // Usar SQL direto para evitar problemas de schema cache
    const variablesJson = variables ? JSON.stringify(variables) : '[]';
    const isActiveValue = is_active !== undefined ? is_active : true;
    
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql_query: `
        INSERT INTO public.email_templates (type, subject, content, variables, is_active, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
        ON CONFLICT (type) 
        DO UPDATE SET 
          subject = EXCLUDED.subject,
          content = EXCLUDED.content,
          variables = EXCLUDED.variables,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `,
      params: [type, subject, body_html, variablesJson, isActiveValue]
    });

    if (sqlError) {
      console.error("Erro ao executar SQL:", JSON.stringify(sqlError));
      
      // Fallback: tentar com query SQL direta via supabase client
      const { error: directError } = await supabase.rpc('upsert_email_template', {
        p_type: type,
        p_subject: subject,
        p_content: body_html,
        p_variables: variablesJson,
        p_is_active: isActiveValue
      });
      
      if (directError) {
        console.error("Erro no fallback:", JSON.stringify(directError));
        throw new Error(`Erro ao salvar: ${directError.message || JSON.stringify(directError)}`);
      }
    }

    console.log("Template salvo com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Template salvo com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro completo:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro desconhecido",
        details: error.toString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/save-email-template' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
