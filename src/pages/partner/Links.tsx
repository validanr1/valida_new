import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Copy, ExternalLink } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

type FormLink = {
  id: string;
  partner_id: string;
  type: "evaluation" | "denunciation";
  base_url: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

const Links = () => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const companyId = (session as any)?.company_id ?? (session as any)?.companyId;

  const [forms, setForms] = useState<FormLink[]>([]);
  const [loading, setLoading] = useState(true);

  const safeCopy = async (text: string) => {
    try {
      if (!text) throw new Error("Texto vazio");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showSuccess("Copiado para a área de transferência.");
        return;
      }
      // Fallback com textarea invisível
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        showSuccess("Copiado para a área de transferência.");
      } else {
        throw new Error("execCommand copy falhou");
      }
    } catch (err) {
      console.error("[Links] Falha ao copiar:", err);
      showError("Não foi possível copiar o texto. Se necessário, selecione e copie manualmente.");
    }
  };

  const fetchForms = useCallback(async (currentPartnerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("partner_id", currentPartnerId);

      if (error) {
        console.error("links: erro ao carregar forms:", error);
        throw error;
      }

      let list = (data ?? []) as FormLink[];
      const formsToUpsert: Partial<FormLink>[] = [];

      const expectedEvalUrl = `${window.location.origin}/avaliacao`;
      let existingEval = list.find(f => f.type === "evaluation");
      if (!existingEval) {
        formsToUpsert.push({ partner_id: currentPartnerId, type: "evaluation", base_url: expectedEvalUrl, enabled: true });
      } else if (!existingEval.base_url) {
        // Só preenche se estiver vazio; não reescreve quando apenas a origem muda (localhost vs IP)
        formsToUpsert.push({ id: existingEval.id, base_url: expectedEvalUrl });
      }

      const expectedDenomUrl = `${window.location.origin}/denuncia`;
      let existingDenom = list.find(f => f.type === "denunciation");
      if (!existingDenom) {
        formsToUpsert.push({ partner_id: currentPartnerId, type: "denunciation", base_url: expectedDenomUrl, enabled: true });
      } else if (!existingDenom.base_url) {
        formsToUpsert.push({ id: existingDenom.id, base_url: expectedDenomUrl });
      }

      if (formsToUpsert.length > 0) {
        const { data: upsertedData, error: upsertError } = await (supabase as any)
          .from("forms")
          .upsert(formsToUpsert as any, { onConflict: "partner_id,type" })
          .select("*");
        if (upsertError) {
          console.error("links: erro ao upsert forms:", upsertError);
          throw upsertError;
        }
        
        // Refetch to get the most consistent state
        const { data: finalList } = await supabase.from("forms").select("*").eq("partner_id", currentPartnerId);
        setForms((finalList as FormLink[]) ?? []);
      } else {
        setForms(list);
      }
    } catch (err) {
      console.error("links: erro ao carregar forms:", err);
      showError("Não foi possível carregar os links dos formulários.");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (partnerId) {
      fetchForms(partnerId);
    } else {
      setLoading(false);
      setForms([]);
    }
  }, [partnerId, fetchForms]);

  const evalForm = forms.find((f) => f.type === "evaluation");
  const denomForm = forms.find((f) => f.type === "denunciation");

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkEval = evalForm ? `${currentOrigin}/avaliacao?company=${companyId}` : "";
  const linkDenom = denomForm ? `${currentOrigin}/denuncia?company=${companyId}` : "";

  const toggleFormEnabled = async (formType: "evaluation" | "denunciation", newEnabledStatus: boolean) => {
    const formToUpdate = forms.find(f => f.type === formType);
    if (!formToUpdate?.id) {
      showError("O formulário correspondente não foi encontrado para alterar o status.");
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("forms")
        .update({ enabled: newEnabledStatus, updated_at: new Date().toISOString() } as any)
        .eq("id", formToUpdate.id)
        .select("*")
        .single();

      if (error) {
        showError(`Falha ao alterar status do link. Detalhes: ${error.message}`);
        // Re-fetch on error to sync UI with DB state
        if (partnerId) fetchForms(partnerId);
        return;
      }

      const updatedForm = data as FormLink;
      setForms(prev => prev.map(f => f.id === updatedForm.id ? updatedForm : f));
      showSuccess(`Link de ${formType === "evaluation" ? "Avaliação" : "Denúncia"} ${newEnabledStatus ? "ativado" : "desativado"}.`);
    } catch (err) {
      console.error(`[Links] Error in toggleFormEnabled for form ${formType}:`, err);
      showError(`Falha ao alterar status do link. Erro inesperado.`);
    }
  };

  const isEvalEnabled = evalForm?.enabled ?? false;
  const isDenomEnabled = denomForm?.enabled ?? false;

  if (!companyId) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <div className="text-sm text-muted-foreground">Selecione uma empresa no topo para gerenciar os links.</div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <LoadingSpinner size={24} />
        <span>Carregando links...</span>
      </div>
    );
  }

  const linkTrackReport = `${currentOrigin}/acompanhar-denuncia`;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Links de Acesso</h1>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Link de Avaliação</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativar/Desativar</span>
            <Switch
              checked={isEvalEnabled}
              onCheckedChange={(newStatus) => toggleFormEnabled("evaluation", newStatus)}
              disabled={loading || !evalForm?.id}
            />
          </div>
        </div>

        <div className={`space-y-2 rounded-lg border p-4 bg-background/80 ${!isEvalEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2">
            <Input
              value={linkEval || "Carregando link..."}
              readOnly
              className="flex-1"
              disabled={!isEvalEnabled}
            />
            <Button variant="outline" onClick={() => safeCopy(linkEval)} disabled={!isEvalEnabled} className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => window.open(linkEval, "_blank")} className="bg-[#1B365D] text-white flex items-center gap-2" disabled={!isEvalEnabled}>
              Abrir <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Link de Denúncias</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativar/Desativar</span>
            <Switch
              checked={isDenomEnabled}
              onCheckedChange={(newStatus) => toggleFormEnabled("denunciation", newStatus)}
              disabled={loading || !denomForm?.id}
            />
          </div>
        </div>
        <div className={`space-y-2 rounded-lg border p-4 bg-background/80 ${!isDenomEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-2">
            <Input
              value={linkDenom || "Carregando..."}
              readOnly
              className="flex-1"
              disabled={!isDenomEnabled}
            />
            <Button variant="outline" onClick={() => safeCopy(linkDenom)} disabled={!isDenomEnabled} className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => window.open(linkDenom, "_blank")} className="bg-[#1B365D] text-white flex items-center gap-2" disabled={!isDenomEnabled}>
              Abrir <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-base font-medium">Link de Acompanhamento de Denúncia</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Página pública onde o denunciante pode acompanhar o status usando o protocolo
          </p>
        </div>
        <div className="space-y-2 rounded-lg border p-4 bg-background/80">
          <div className="flex items-center gap-2">
            <Input
              value={linkTrackReport}
              readOnly
              className="flex-1"
            />
            <Button variant="outline" onClick={() => safeCopy(linkTrackReport)} className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => window.open(linkTrackReport, "_blank")} className="bg-[#1B365D] text-white flex items-center gap-2">
              Abrir <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Compartilhe este link com os denunciantes para que possam acompanhar suas denúncias
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Links;