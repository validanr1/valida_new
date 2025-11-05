import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { emailService } from "@/services/emailService";
import { getSettings } from "@/services/settings";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PartnerSignup = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [params] = useSearchParams();
  const [partnerName, setPartnerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

  // Load active plans and preselect from query (?plan=)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPlans(true);
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,slug,status") as any;
      if (mounted) {
        const list = ((data as any[]) || []).filter((p: any) => (p.status || "").toLowerCase() === "active");
        setPlans(list);
        const qp = (params.get("plan") || "").toLowerCase();
        if (qp && list.length) {
          const match = list.find(
            (p) =>
              (p.id && String(p.id).toLowerCase() === qp) ||
              (p.slug && String(p.slug).toLowerCase() === qp) ||
              (p.name && String(p.name).toLowerCase() === qp)
          );
          setSelectedPlanId(match?.id || list[0]?.id);
        } else if (list.length) {
          setSelectedPlanId(list[0].id);
        }
        setLoadingPlans(false);
      }
    })();
    return () => { mounted = false; };
  }, [params]);

  const selectedPlan = useMemo(() => plans.find((p) => p.id === selectedPlanId), [plans, selectedPlanId]);

  const onSubmit = async () => {
    if (!session?.user?.id) {
      showError("Você precisa entrar para concluir o cadastro do parceiro.");
      return;
    }
    const name = partnerName.trim();
    if (!name) {
      showError("Informe o nome do parceiro.");
      return;
    }
    if (!selectedPlanId) {
      showError("Selecione um plano.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: partner, error } = await supabase
        .from("partners")
        .insert({ name, status: "pending", plan_id: selectedPlanId } as any)
        .select("id,name,status")
        .single();
      if (error || !partner) {
        console.error("[PartnerSignup] erro ao criar parceiro:", error);
        showError("Falha ao criar parceiro.");
        return;
      }
      await supabase
        .from("partner_members")
        .insert({ partner_id: (partner as any).id, user_id: session.user.id } as any);
      showSuccess("Solicitação enviada. Em breve entraremos em contato com instruções de pagamento.");

      // Fire-and-forget admin notification (non-blocking)
      getSettings().then((settings) => {
        const recipient = settings.leadsNotifyEmail || settings.supportEmail || settings.emailFromAddress;
        console.log('[PartnerSignup] DEBUG - settings:', { 
          leadsNotifyEmail: settings.leadsNotifyEmail, 
          supportEmail: settings.supportEmail, 
          emailFromAddress: settings.emailFromAddress,
          recipient 
        });
        if (recipient) {
          console.log('[PartnerSignup] Enviando notificação para:', recipient);
          emailService.sendEdgeNotificationEmail({
            action: 'notify_signup',
            recipient_email: recipient,
            data: {
              user_email: session.user.email || '',
              when: new Date().toISOString(),
              name,
              plan: selectedPlan?.name,
            },
          }).catch((e) => {
            console.warn('[PartnerSignup] notify_signup email failed (non-blocking):', e);
          });
        } else {
          console.warn('[PartnerSignup] Nenhum recipient configurado - notificação não enviada');
        }
      }).catch((e) => {
        console.warn('[PartnerSignup] getSettings failed (non-blocking):', e);
      });
      navigate("/partner/ativacao", { replace: true });
    } catch (err) {
      console.error("[PartnerSignup] erro:", err);
      showError("Erro inesperado ao criar o parceiro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Cadastro de Parceiro</h1>
      <div className="text-sm text-muted-foreground mb-4 space-y-1">
        <p>Preencha os dados para iniciar sua solicitação. O pagamento será confirmado manualmente pela equipe.</p>
        {selectedPlan ? (
          <p><span className="font-medium text-foreground">Plano selecionado:</span> {selectedPlan.name}</p>
        ) : null}
      </div>
      <Card className="p-5 space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Plano</label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={loadingPlans || plans.length === 0}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder={loadingPlans ? "Carregando planos..." : "Selecione um plano"} />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
              {plans.length === 0 && <SelectItem value="no-plan" disabled>Nenhum plano ativo</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do Parceiro</label>
          <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Ex.: ACME Consultoria" />
        </div>
        {!session?.user?.id ? (
          <div className="text-sm">
            Faça <Link to="/login" className="text-blue-600 underline">login</Link> para concluir o cadastro.
          </div>
        ) : null}
        <div>
          <Button onClick={onSubmit} disabled={isSubmitting || !session?.user?.id}>
            {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PartnerSignup;
