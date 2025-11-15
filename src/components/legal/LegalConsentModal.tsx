import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError, showSuccess } from "@/utils/toast";

const LegalConsentModal = () => {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [activeTerms, setActiveTerms] = useState<number | null>(null);
  const [activePrivacy, setActivePrivacy] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session?.user?.id) return;
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("legal_documents").select("versao").eq("tipo", "termos").eq("ativo", true).maybeSingle(),
        supabase.from("legal_documents").select("versao").eq("tipo", "privacidade").eq("ativo", true).maybeSingle(),
      ]);
      const tv = (t as any)?.versao as number | undefined;
      const pv = (p as any)?.versao as number | undefined;
      setActiveTerms(tv ?? null);
      setActivePrivacy(pv ?? null);
      if (!tv && !pv) return;
      const { data: acc } = await supabase
        .from("user_legal_acceptance")
        .select("documento_tipo,versao")
        .eq("user_id", session.user.id);
      const acceptedTerms = acc?.some((x: any) => x.documento_tipo === "termos" && x.versao === tv);
      const acceptedPriv = acc?.some((x: any) => x.documento_tipo === "privacidade" && x.versao === pv);
      if (!acceptedTerms || !acceptedPriv) setOpen(true);
    })();
    return () => { mounted = false; };
  }, [session?.user?.id]);

  const accept = async () => {
    if (!checked || !session?.user?.id) return;
    const rows = [] as any[];
    if (activeTerms) rows.push({ user_id: session.user.id, documento_tipo: "termos", versao: activeTerms, data_hora: new Date().toISOString() });
    if (activePrivacy) rows.push({ user_id: session.user.id, documento_tipo: "privacidade", versao: activePrivacy, data_hora: new Date().toISOString() });
    const { error } = await supabase.from("user_legal_acceptance").insert(rows);
    if (error) { showError("Falha ao registrar aceite."); return; }
    setOpen(false);
    showSuccess("Aceite registrado.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualização de Termos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>Atualizamos nossos documentos legais. Leia e aceite para continuar.</p>
          <ul className="list-disc pl-5">
            <li><a href="/termos-de-uso" className="underline">Termos de Uso</a> {activeTerms ? `(v${activeTerms})` : ""}</li>
            <li><a href="/politica-de-privacidade" className="underline">Política de Privacidade</a> {activePrivacy ? `(v${activePrivacy})` : ""}</li>
          </ul>
          <label className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} /> Eu li e concordo</label>
        </div>
        <DialogFooter>
          <Button onClick={accept} disabled={!checked}>Aceito e concordo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalConsentModal;