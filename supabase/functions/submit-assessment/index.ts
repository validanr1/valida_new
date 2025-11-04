import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Immediately handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("submit-assessment: Request received.");

    // Parse request payload
    let payload;
    try {
      payload = await req.json();
      console.log("submit-assessment: Payload received:", JSON.stringify(payload, null, 2));
    } catch (jsonError) {
      console.error("submit-assessment: Error parsing JSON body:", jsonError);
      throw new Error(`Invalid JSON body: ${jsonError.message}`);
    }

    const {
      company_id,
      partner_id,
      first_name,
      age,
      gender,
      department,
      role,
      ghe,
      ges,
      answers,
      averageScore,
    } = payload;

    // Validate required fields
    if (!company_id || !partner_id || !answers) {
      const missingFields = [
        !company_id && 'company_id',
        !partner_id && 'partner_id',
        !answers && 'answers'
      ].filter(Boolean).join(', ');
      console.error("submit-assessment: Missing required fields:", missingFields);
      throw new Error(`Missing required fields: ${missingFields}`);
    }

    // 1. Insert into assessments table
    const assessmentInsertPayload = {
      partner_id,
      company_id,
      first_name: first_name || null,
      age: age || null,
      gender: gender || null,
      department: department || null,
      role: role || null,
      ghe: ghe || null,
      ges: ges || null,
      status: "completed",
      score: averageScore,
    };
    console.log("submit-assessment: Attempting to insert into 'assessments':", JSON.stringify(assessmentInsertPayload, null, 2));

    const { data: assessmentData, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .insert(assessmentInsertPayload)
      .select("id")
      .single();

    if (assessmentError) {
      console.error("submit-assessment: DB error inserting into 'assessments':", assessmentError);
      throw new Error(`Database error on assessment insert: ${assessmentError.message} (Code: ${assessmentError.code})`);
    }
    const assessmentId = assessmentData.id;
    console.log("submit-assessment: Inserted into 'assessments' with ID:", assessmentId);

    // 2. Insert into assessment_responses table
    const responsesToInsert = Object.entries(answers).map(([questionId, answer]) => ({
      assessment_id: assessmentId,
      question_id: questionId,
      answer_value: (answer as any).answerValue,
      is_inverse: (answer as any).isInverse,
      scored_value: (answer as any).scoredValue,
    }));
    
    if (responsesToInsert.length > 0) {
        console.log("submit-assessment: Attempting to insert responses:", JSON.stringify(responsesToInsert, null, 2));
        const { error: responsesError } = await supabaseAdmin
          .from("assessment_responses")
          .insert(responsesToInsert);

        if (responsesError) {
          console.error("submit-assessment: DB error inserting into 'assessment_responses':", responsesError);
          throw new Error(`Database error on responses insert: ${responsesError.message} (Code: ${responsesError.code})`);
        }
        console.log("submit-assessment: Inserted into 'assessment_responses' successfully.");
    }

    // 3. Update usage_counters for the partner
    console.log(`submit-assessment: Updating usage_counters for partner ${partner_id}`);
    const { error: rpcError } = await supabaseAdmin.rpc('increment_assessment_count', { p_partner_id: partner_id });

    if (rpcError) {
        // Log the error but don't make the whole request fail, as the assessment is already saved.
        console.error("submit-assessment: Error calling increment_assessment_count RPC:", rpcError);
    } else {
        console.log(`submit-assessment: usage_counters updated successfully for partner ${partner_id}.`);
    }

    // Success response
    return new Response(
      JSON.stringify({ message: "Assessment submitted successfully.", assessmentId }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      },
    );

  } catch (error) {
    // This is the critical part: catch ANY error and return it in the response body.
    console.error("submit-assessment: A critical error occurred in the Edge Function:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred in the Edge Function.",
        details: error.message,
        stack: error.stack, // Including stack for better debugging
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});