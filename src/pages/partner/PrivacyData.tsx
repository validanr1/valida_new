import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError, showSuccess } from "@/utils/toast";

const PrivacyData = () => {
  const { session } = useSession();
  const [consent, setConsent] = useState<{ essenciais: boolean; analiticos: boolean; marketing: boolean } | null>(null);
  const [requestType, setRequestType] = useState<string>("exclusao");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase.from("cookie_consent").select("essenciais,analiticos,marketing").eq("user_id", session.user.id).maybeSingle();
      if (data) setConsent({ essenciais: (data as any).essenciais, analiticos: (data as any).analiticos, marketing: (data as any).marketing });
    })();
  }, [session?.user?.id]);

  const updateConsent = async (field: "essenciais"|"analiticos"|"marketing", value: boolean) => {
    if (!session?.user?.id) return;
    const payload: any = { user_id: session.user.id, data_hora: new Date().toISOString() };
    payload[field] = value;
    const { error } = await supabase.from("cookie_consent").upsert(payload, { onConflict: "user_id" });
    if (error) { showError("Falha ao atualizar consentimento."); return; }
    setConsent((c) => c ? { ...c, [field]: value } : { essenciais: true, analiticos: false, marketing: false });
    showSuccess("Consentimento atualizado.");
  };

  const request = async () => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("lgpd_requests").insert({ user_id: session.user.id, tipo: requestType, status: "aberto" });
    if (error) { showError("Falha ao enviar solicitação."); return; }
    showSuccess("Solicitação enviada.");
  };

  const downloadData = async () => {
    setDownloading(true);
    try {
      // Simplificado: baixa os perfis e avaliações
      const [{ data: prof }, { data: ass }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session?.user?.id).maybeSingle(),
        supabase.from("assessments").select("*").eq("employee_id", session?.user?.id),
      ]);
      const blob = new Blob([JSON.stringify({ profile: prof, assessments: ass }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "meus_dados.json"; a.click(); URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Privacidade & Dados</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie seus dados e consentimentos conforme LGPD.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Download dos dados pessoais</div>
        <Button onClick={downloadData} disabled={downloading}>{downloading ? "Preparando..." : "Baixar meus dados"}</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Solicitações LGPD</div>
        <div className="grid gap-3 md:grid-cols-[240px_auto] items-center">
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exclusao">Exclusão</SelectItem>
              <SelectItem value="correcao">Retificação</SelectItem>
              <SelectItem value="portabilidade">Portabilidade</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={request}>Enviar solicitação</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Gerenciar Cookies</div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consent?.essenciais ?? true} onChange={(e) => updateConsent("essenciais", e.target.checked)} /> Essenciais
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consent?.analiticos ?? false} onChange={(e) => updateConsent("analiticos", e.target.checked)} /> Analíticos
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consent?.marketing ?? false} onChange={(e) => updateConsent("marketing", e.target.checked)} /> Marketing
          </label>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyData;