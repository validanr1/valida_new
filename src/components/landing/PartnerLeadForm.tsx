import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { showError, showSuccess } from "@/utils/toast";

const isEmail = (v: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v.trim());
const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

export default function PartnerLeadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showError("Informe seu nome.");
    if (!isEmail(email)) return showError("Informe um e-mail válido.");
    const phoneDigits = onlyDigits(phone);
    if (phoneDigits && !(phoneDigits.length === 10 || phoneDigits.length === 11)) {
      return showError("Informe um WhatsApp válido (DDD + número).");
    }

    setLoading(true);
    try {
      // Insert lead (anon insert allowed by RLS)
      const { error: insErr } = await supabase
        .from("partner_leads")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          company: company.trim() || null,
          phone_whatsapp: phoneDigits || null,
          message: message.trim() || null,
          status: "new",
        } as any);
      if (insErr) throw insErr;

      // Notify admin team via edge function (public action)
      const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
      if (base) {
        await fetch(`${base}/functions/v1/admin-leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "notify_new_lead",
            name,
            email,
            phone_whatsapp: phoneDigits,
          }),
        }).catch(() => {});
      }

      setSuccess(true);
      showSuccess("Recebemos sua solicitação. Entraremos em contato em breve.");
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setMessage("");
    } catch (e: any) {
      console.error("[PartnerLeadForm] error:", e);
      showError(e?.message || "Falha ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-6 bg-emerald-50 border-emerald-200 text-emerald-900">
        <div className="text-lg font-medium">Recebemos sua solicitação.</div>
        <div className="text-sm mt-1">Entraremos em contato em breve.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-2">Seja um parceiro</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Preencha seus dados e retornaremos em breve para concluir seu onboarding.
      </p>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div>
            <label className="text-sm font-medium">WhatsApp</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98765-4321" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Empresa</label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" />
        </div>
        <div>
          <label className="text-sm font-medium">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border rounded-md p-2 h-28"
            placeholder="Conte mais sobre sua necessidade"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar"}</Button>
        </div>
      </form>
    </Card>
  );
}
