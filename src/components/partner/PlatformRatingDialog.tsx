"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";

interface PlatformRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlatformRatingDialog = ({ open, onOpenChange }: PlatformRatingDialogProps) => {
  const { session } = useSession();
  const partnerId = (session as any)?.partnerId ?? (session as any)?.partner_id;
  const userId = (session as any)?.user?.id ?? (session as any)?.user_id;

  const [score, setScore] = useState<string>("5"); // Default to 5 stars
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveRating = async () => {
    if (!partnerId || !userId) {
      showError("Você precisa estar logado como parceiro para avaliar a plataforma.");
      return;
    }
    if (!score) {
      showError("Por favor, selecione uma pontuação.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        partner_id: partnerId,
        user_id: userId,
        score: parseInt(score, 10),
        comment: comment.trim() ? comment.trim() : null,
      };
      const { error } = await (supabase as any).from("platform_ratings").insert(payload);

      if (error) {
        console.error("Failed to submit platform rating:", error);
        showError("Falha ao enviar sua avaliação. Tente novamente.");
        return;
      }

      showSuccess("Sua avaliação foi enviada com sucesso! Obrigado pelo feedback.");
      setScore("5");
      setComment("");
      onOpenChange(false);
    } catch (err) {
      console.error("Unexpected error submitting platform rating:", err);
      showError("Ocorreu um erro inesperado ao enviar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (selectedScore: string) => (
    <div className="flex items-center gap-0.5 text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-5 w-5 ${i < parseInt(selectedScore) ? 'fill-yellow-500' : 'fill-gray-300'}`} />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Avaliar Plataforma</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sua Pontuação</label>
            <Select value={score} onValueChange={setScore} disabled={isSubmitting}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione uma pontuação" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} Estrela{s > 1 ? "s" : ""} {renderStars(String(s))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Comentário (Opcional)</label>
            <Textarea
              placeholder="Compartilhe seu feedback sobre a plataforma..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSaveRating} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlatformRatingDialog;