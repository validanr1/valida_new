import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSettings } from "@/services/settings";

const PartnerLead = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [planName, setPlanName] = useState<string>("");
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>("");

  useEffect(() => {
    setPlanId(params.get("plan") || undefined);
  }, [params]);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setSupportWhatsapp(settings.supportWhatsapp || "");
      } catch (e) {
        console.warn("[PartnerLead] Falha ao carregar settings", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!planId) return;
      const { data, error } = await supabase
        .from("plans")
        .select("id,name")
        .eq("id", planId)
        .maybeSingle();
      if (error) {
        console.error("[PartnerLead] erro ao buscar plano:", error);
      }
      const row = data as { id: string; name?: string } | null;
      if (!row) {
        setPlanName("");
        return;
      }
      setPlanName(row.name || "");
    })();
  }, [planId]);

  const buildWhatsappLink = (targetPhone: string, msg: string) => {
    let digits = (targetPhone || "").replace(/\D/g, "");
    // Se vier sem DDI e com 11 dígitos (padrão BR), prefixa 55
    if (digits.length === 11) {
      digits = `55${digits}`;
    }
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/${digits}?text=${encoded}`;
  };

  const isValidEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value.trim());
  const normalizePhone = (value: string) => value.replace(/\D/g, "");
  const formatPhone = (value: string) => {
    const digits = normalizePhone(value).slice(0, 11); // limita a 11 dígitos
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`; // 10 dígitos
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`; // 11 dígitos
  };
  const isValidBrPhone = (value: string) => {
    const digits = normalizePhone(value);
    // Aceita 10 ou 11 dígitos (sem DDI). Ex.: DDD+telefone
    return digits.length === 10 || digits.length === 11;
  };

  const onSubmit = async () => {
    if (!name.trim()) {
      showError("Informe seu nome.");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      showError("Informe um e-mail válido.");
      return;
    }
    if (!phone.trim() || !isValidBrPhone(phone)) {
      showError("Informe um WhatsApp válido (com DDD).");
      return;
    }
    if (!planId) {
      showError("Plano inválido. Volte e selecione um plano.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Grava lead na tabela partner_leads (RLS deve permitir insert anônimo ou use Edge Function futuramente)
      const { error } = await supabase.from("partner_leads").insert({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || null,
        phone_whatsapp: normalizePhone(phone),
        plan_id: planId,
        status: "new",
      } as any);
      if (error) {
        console.error("[PartnerLead] erro ao inserir lead:", error);
        showError("Não foi possível enviar seu interesse. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      const planLabel = planName || planId;

      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/admin-leads`;
        await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "notify_new_lead",
            name: name.trim(),
            email: email.trim(),
            phone_whatsapp: normalizePhone(phone),
            plan_id: planId,
            plan_name: planLabel,
          }),
        });
      } catch (e) {
        console.warn("[PartnerLead] notify_new_lead falhou (seguindo fluxo):", e);
      }

      const message = `Olá! Tenho interesse na plataforma.\n\nNome: ${name}\nE-mail: ${email}\nWhatsApp: ${normalizePhone(phone)}\nPlano: ${planLabel}`;

      if (!supportWhatsapp) {
        showSuccess("Recebemos seu interesse! Em instantes entraremos em contato.");
        navigate("/", { replace: true });
        return;
      }

      const waUrl = buildWhatsappLink(supportWhatsapp, message);
      window.location.href = waUrl;
    } catch (err) {
      console.error("[PartnerLead] erro inesperado:", err);
      showError("Falha inesperada. Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Demonstração / Interesse no Plano</h1>
      <div className="text-sm text-muted-foreground mb-4 space-y-1">
        <p>Preencha seus dados e vamos continuar seu atendimento pelo WhatsApp.</p>
        {planName ? (
          <p><span className="font-medium text-foreground">Plano selecionado:</span> {planName}</p>
        ) : null}
      </div>
      <Card className="p-5 space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">E-mail</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">WhatsApp</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(88) 88888-8888"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Empresa (opcional)</label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex.: ACME LTDA" />
        </div>
        <div>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Continuar no WhatsApp"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PartnerLead;
