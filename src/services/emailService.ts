import { currentSession } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";

interface SendEmailPayload {
  to: string;
  templateType: string; // Ex: "partner_invite", "password_reset"
  variables?: Record<string, string>; // Pares chave-valor para os placeholders do template
}

const SUPABASE_PROJECT_ID = "ymuzggvvslpxaabozmck"; // Seu ID de Projeto Supabase
const SUPABASE_EDGE_FUNCTION_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-email`;

export const emailService = {
  sendTransactionalEmail: async (payload: SendEmailPayload): Promise<{ message: string }> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    const response = await fetch(SUPABASE_EDGE_FUNCTION_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Email service error:", data);
      throw new Error(data?.error || "Falha ao enviar e-mail transacional.");
    }
    return data as { message: string };
  },
  
  // New helper: send email via Edge Function with action-based payload
  sendEdgeNotificationEmail: async (payload: { action: string; recipient_email: string; data?: Record<string, any> }): Promise<any> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error("Sessão não encontrada para enviar notificação.");
    }

    const response = await fetch(SUPABASE_EDGE_FUNCTION_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: payload.action, recipient_email: payload.recipient_email, data: payload.data || {} }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Email service (edge) error:", data);
      throw new Error(data?.error || "Falha ao enviar e-mail (edge).");
    }
    return data;
  },
};