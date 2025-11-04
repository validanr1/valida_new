"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { syncAndStoreLocalSession } from "@/services/auth";

const SetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!newPassword || !confirmPassword) {
      showError("Por favor, preencha ambos os campos de senha.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 6) { // Supabase default minimum password length
      showError("A senha deve ter pelo menos 6 caracteres.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("As senhas não coincidem.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error("Erro ao definir nova senha:", error);
        showError(error.message || "Não foi possível definir a nova senha. Tente novamente.");
      } else {
        showSuccess("Sua senha foi definida com sucesso! Redirecionando para o login.");
        // After setting password, ensure session is synced and redirect to login
        await syncAndStoreLocalSession();
        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("Erro inesperado ao definir senha:", error);
      showError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <Card className="w-full max-w-md p-6 sm:p-8 rounded-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold leading-tight">Definir Nova Senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Por favor, crie uma nova senha para sua conta.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova Senha</label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Sua nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 rounded-xl pr-10"
                required
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                onClick={() => setShowNewPassword((v) => !v)}
                disabled={isSubmitting}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showNewPassword ? "Esconder senha" : "Mostrar senha"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmar Nova Senha</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 rounded-xl pr-10"
                required
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                onClick={() => setShowConfirmPassword((v) => !v)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showConfirmPassword ? "Esconder senha" : "Mostrar senha"}</span>
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full rounded-full bg-[#1DB584] text-white hover:bg-[#159a78]" disabled={isSubmitting}>
            {isSubmitting ? "Definindo senha..." : "Definir Senha"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default SetPassword;