import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { showError, showSuccess } from "@/utils/toast";

// Minimal review type
type PlatformRating = {
  id: string;
  user_id: string;
  partner_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

interface PlatformRatingsCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5 text-yellow-500">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < value ? "fill-yellow-500" : "fill-gray-300"}`} />
    ))}
  </div>
);

const PlatformRatingsCenterDialog = ({ open, onOpenChange }: PlatformRatingsCenterDialogProps) => {
  console.log("[PlatformRatingsCenterDialog] render, open=", open);
  const { session } = useSession();
  const partnerIdFromSession = (session as any)?.partner_id;
  const userId = (session as any)?.user_id ?? (session as any)?.user?.id; // fallback
  const userEmail = (session as any)?.user?.email as string | undefined;
  const [resolvedPartnerId, setResolvedPartnerId] = useState<string | null>(partnerIdFromSession ?? null);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlatformRating[]>([]);

  // New review form state (inline)
  const [posting, setPosting] = useState(false);
  const [score, setScore] = useState<string>("5");
  const [comment, setComment] = useState("");

  // Resolve partner_id: prefer session.partner_id, otherwise try partner_members by user_id, then partners by responsible_email
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      if (resolvedPartnerId) return; // already resolved
      // 1) partner_members by user_id
      if (userId) {
        try {
          const { data, error } = await supabase
            .from("partner_members")
            .select("partner_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (!mounted) return;
          if (!error && (data as any)?.partner_id) {
            setResolvedPartnerId((data as any).partner_id);
            return;
          }
        } catch (e) {
          console.warn("[PlatformRatingsCenterDialog] partner_members lookup error:", e);
        }
      }
      // 2) partners by responsible_email
      if (userEmail) {
        try {
          const { data, error } = await supabase
            .from("partners")
            .select("id")
            .eq("responsible_email", userEmail)
            .maybeSingle();
          if (!mounted) return;
          if (!error && (data as any)?.id) {
            setResolvedPartnerId((data as any).id);
            return;
          }
        } catch (e) {
          console.warn("[PlatformRatingsCenterDialog] partners by responsible_email lookup error:", e);
        }
      }
    })();
    return () => { mounted = false; };
  }, [open, userId, userEmail, resolvedPartnerId]);

  // Load list when we have an effective partner id
  useEffect(() => {
    console.log("[PlatformRatingsCenterDialog] open/useEffect, open=", open, "resolvedPartnerId=", resolvedPartnerId);
    if (!open) return;
    let mounted = true;
    const load = async () => {
      if (!resolvedPartnerId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("platform_ratings")
          .select("id, user_id, partner_id, score, comment, created_at")
          .eq("partner_id", resolvedPartnerId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setItems((data as PlatformRating[]) ?? []);
      } catch (e) {
        console.error("[PlatformRatingsCenterDialog] Failed to load ratings:", e);
        showError("Falha ao carregar avaliações.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [open, resolvedPartnerId]);

  const onSubmitNew = async () => {
    const effectivePartnerId = resolvedPartnerId;
    if (!effectivePartnerId || !userId) {
      showError("É necessário estar logado para avaliar.");
      return;
    }
    if (!score) {
      showError("Selecione uma pontuação.");
      return;
    }
    setPosting(true);
    try {
      const payload: any = {
        partner_id: effectivePartnerId,
        user_id: userId,
        score: parseInt(score),
        comment: comment.trim() || null,
      };
      const { data, error } = await supabase
        .from("platform_ratings")
        .insert([payload] as any)
        .select("id, user_id, partner_id, score, comment, created_at")
        .single();
      if (error) throw error;
      setItems((prev) => [data as PlatformRating, ...prev]);
      setScore("5");
      setComment("");
      showSuccess("Avaliação enviada!");
    } catch (e) {
      console.error("[PlatformRatingsCenterDialog] Failed to submit rating:", e);
      showError("Falha ao enviar avaliação.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] z-[100]">
        <DialogHeader>
          <DialogTitle>Avaliações da Plataforma</DialogTitle>
          <DialogDescription>Envie sua pontuação e comentário sobre a plataforma.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {!resolvedPartnerId ? (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 px-3 py-2 text-sm">
              Não foi possível identificar seu parceiro automaticamente. Você ainda pode visualizar este painel, mas será necessário estar vinculado a um parceiro para enviar uma avaliação.
            </div>
          ) : null}
          {/* New review inline form */}
          <div className="rounded-lg border p-3">
            <div className="grid gap-3 md:grid-cols-[160px_1fr] items-start">
              <div>
                <label className="text-sm font-medium">Sua Pontuação</label>
                <Select value={score} onValueChange={setScore} disabled={posting}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {[1,2,3,4,5].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s} Estrela{s>1?"s":""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Comentário (opcional)</label>
                <Textarea
                  rows={3}
                  placeholder="Compartilhe seu feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={posting}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button onClick={onSubmitNew} disabled={posting || !resolvedPartnerId}>
                {posting ? "Enviando..." : "Enviar avaliação"}
              </Button>
            </div>
          </div>

          {/* Ratings list */}
          <div className="space-y-2 max-h-[360px] overflow-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando avaliações...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="rounded-lg border p-3 flex items-start gap-3">
                  <Stars value={it.score} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zinc-500">{new Date(it.created_at).toLocaleString()}</div>
                    <div className="text-sm break-words whitespace-pre-wrap">{it.comment ?? "(sem comentário)"}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformRatingsCenterDialog;
