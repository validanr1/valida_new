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

    console.log("Deletando template existente...");

    // Primeiro deletar o existente
    await supabase
      .from('email_templates')
      .delete()
      .eq('type', type);

    console.log("Inserindo novo template...");

    // Depois inserir o novo (usando service_role bypassa schema cache)
    // Inserir apenas os campos que sabemos que existem
    const insertData: any = {
      type,
      subject,
      body_html,
    };
    
    // Adicionar variables se fornecido
    if (variables) {
      insertData.variables = variables;
    }
    
    // Adicionar status se fornecido (campo pode ter nome diferente)
    if (is_active !== undefined) {
      insertData.status = is_active ? 'active' : 'inactive';
    }
    
    console.log("Dados a inserir:", insertData);
    
    const { error: insertError } = await supabase
      .from('email_templates')
      .insert(insertData);

    if (insertError) {
      console.error("Erro ao inserir:", JSON.stringify(insertError));
      throw new Error(`Erro ao salvar: ${insertError.message || JSON.stringify(insertError)}`);
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
