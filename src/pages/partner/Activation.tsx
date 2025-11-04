import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type PartnerRow = { status?: string; name?: string };

const POLL_MS = 5000;

const Activation = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const partnerId = session?.partnerId;

  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [loading, setLoading] = useState(false);

  const status = (partner?.status || "").toLowerCase();
  const isActive = status === "active";

  const fetchStatus = async () => {
    if (!partnerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("name,status")
      .eq("id", partnerId)
      .maybeSingle();
    if (!error) setPartner((data as PartnerRow) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(t);
  }, [partnerId]);

  useEffect(() => {
    if (isActive) {
      navigate("/partner", { replace: true });
    }
  }, [isActive, navigate]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "awaiting_payment":
        return "Aguardando Pagamento";
      case "rejected":
        return "Recusado";
      case "active":
        return "Ativo";
      default:
        return "Indefinido";
    }
  }, [status]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Ativação do Parceiro</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Acompanhe o status da sua ativação e instruções de pagamento.
      </p>

      <Card className="p-5 space-y-3">
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">Parceiro</div>
          <div className="text-lg font-semibold">{partner?.name || "—"}</div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-lg font-medium">{statusLabel}</div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Instruções de Pagamento</div>
          <div className="text-sm text-muted-foreground">
            Envie o pagamento conforme combinado com a equipe e aguarde a confirmação.
            Você receberá um e-mail quando sua conta for ativada. Em caso de dúvidas,
            entre em contato pelo WhatsApp de suporte configurado nas Configurações.
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Button variant="outline" onClick={fetchStatus} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
          {!isActive ? (
            <div className="text-xs text-muted-foreground self-center">
              Esta página atualiza automaticamente a cada {POLL_MS / 1000}s.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

export default Activation;
