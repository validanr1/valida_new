import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { getSettings } from "@/services/settings";
import LoadingSpinner from "@/components/LoadingSpinner";

const SetupMaster = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
  // superAdminRoleId não é mais necessário aqui, pois a função Edge o busca

  // Se já estiver logado, redireciona
  useEffect(() => {
    let mounted = true;
    const checkAuthAndSettings = async () => {
      setLoadingSettings(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (mounted) navigate("/admin", { replace: true });
          return;
        }

        const settings = await getSettings();
        if (mounted) {
          setAllowNewRegistrations(settings.allowNewRegistrations);
          if (!settings.allowNewRegistrations) {
            showError("Novos registros estão desativados no momento.");
            if (mounted) navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        console.error("Failed to load settings or check session:", error);
        showError("Falha ao carregar configurações ou verificar sessão.");
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    };
    checkAuthAndSettings();
    return () => { mounted = false; };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showError("Informe e-mail e senha.");
      return;
    }

    if (!allowNewRegistrations) {
      showError("Novos registros estão desativados no momento.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-super-admin", {
        body: {
          email: email.trim().toLowerCase(),
          password,
          firstName: name || undefined,
          // roleProfileId e is_setup_master são tratados dentro da função Edge
        },
      });

      if (error) {
        console.error("Erro ao invocar função Edge create-super-admin:", error);
        showError(data?.error || "Falha ao criar usuário Master. Tente novamente.");
        return;
      }

      showSuccess("Usuário Master criado com sucesso. Faça login para continuar.");
      navigate("/login", { replace: true }); // Redireciona para o login
    } catch (error) {
      console.error("Erro inesperado ao criar usuário Master:", error);
      showError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-10 sm:py-14">
        <Card className="w-full rounded-2xl p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold leading-tight">Criar Usuário Master</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Este passo inicial cria o administrador da plataforma (SuperAdmin).
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Seu nome (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="admin@suaempresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                placeholder="Crie uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !allowNewRegistrations}
              className="mt-2 w-full rounded-full bg-[#1B365D] text-white hover:bg-[#162a48]"
              size="lg"
            >
              {submitting ? "Criando..." : "Criar usuário Master"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SetupMaster;