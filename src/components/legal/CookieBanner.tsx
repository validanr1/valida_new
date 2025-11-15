import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError, showSuccess } from "@/utils/toast";

const CookieBanner = () => {
  const { session } = useSession();
  const [show, setShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState("Este site utiliza cookies para melhorar sua experiência.");
  const [essenciais, setEssenciais] = useState(true);
  const [analiticos, setAnaliticos] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: settings } = await supabase.from("platform_settings").select("cookie_banner_enabled,cookie_banner_text").eq("id", "00000000-0000-0000-0000-000000000001").maybeSingle();
      const enabled = Boolean((settings as any)?.cookie_banner_enabled);
      const bannerText = (settings as any)?.cookie_banner_text ?? text;
      setText(bannerText);
      if (!enabled) { setShow(false); return; }
      if (!session?.user?.id) { setShow(true); return; }
      const { data: consent } = await supabase.from("cookie_consent").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!consent) { setShow(true); } else { setShow(false); }
    })();
    return () => { mounted = false; };
  }, [session?.user?.id]);

  const acceptAll = async () => {
    if (!session?.user?.id) { setShow(false); return; }
    const { error } = await supabase.from("cookie_consent").upsert({
      user_id: session.user.id,
      essenciais: true,
      analiticos: true,
      marketing: true,
      data_hora: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) { showError("Falha ao salvar consentimento."); return; }
    setShow(false);
    showSuccess("Consentimento salvo.");
  };

  const saveCustom = async () => {
    if (!session?.user?.id) { setModalOpen(false); setShow(false); return; }
    const { error } = await supabase.from("cookie_consent").upsert({
      user_id: session.user.id,
      essenciais,
      analiticos,
      marketing,
      data_hora: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) { showError("Falha ao salvar consentimento."); return; }
    setModalOpen(false);
    setShow(false);
    showSuccess("Consentimento atualizado.");
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <Card className="p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            {text} {" "}
            <Link to="/politica-de-cookies" className="underline">
              Política de Cookies
            </Link>
          </div>
          <div className="flex gap-2">
            <Button onClick={acceptAll}>Aceitar todos</Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Gerenciar cookies</Button>
          </div>
        </div>
      </Card>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de Cookies</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={essenciais} onCheckedChange={(v) => setEssenciais(Boolean(v))} /> Essenciais</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={analiticos} onCheckedChange={(v) => setAnaliticos(Boolean(v))} /> Analíticos</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(Boolean(v))} /> Marketing</label>
            <div className="pt-2 flex gap-2">
              <Button onClick={saveCustom}>Salvar preferências</Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CookieBanner;