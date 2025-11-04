import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { getSettings, type PlatformSettings } from "@/services/settings";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { Eye, EyeOff } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import LoginPromo from "@/components/auth/LoginPromo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(1, { message: "Por favor, insira sua senha." }),
});

const resetSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

type AuthView = "sign_in" | "forgotten_password";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: providerLoading } = useSession();
  const hasSupabaseEnv = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  const sessionLoading = hasSupabaseEnv ? providerLoading : false;

  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: "Valida NR1",
    description: "Avaliação de Riscos Psicossociais",
    logoPrimaryDataUrl: undefined,
    logoNegativeDataUrl: undefined,
    maintenanceMode: false,
    allowNewRegistrations: true,
    supportWhatsapp: "",
    emailFromAddress: "onboarding@resend.dev", // Adicionado default para o novo campo
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const logoPrimary = settings.logoPrimaryDataUrl;
  const [view, setView] = useState<AuthView>("sign_in");

  // Removido: [loginInitiated, setLoginInitiated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  // Efeito para redirecionar após o login bem-sucedido
  useEffect(() => {
    if (!sessionLoading && session) {
      console.log("[Login.tsx] Session found, redirecting based on roleContext:", session.roleContext);
      const redirectTo = session.roleContext === "SuperAdmin" ? "/admin" : "/partner";
      navigate(redirectTo, { replace: true });
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      setLoadingSettings(true);
      try {
        const fetchedSettings = await getSettings();
        if (mounted) setSettings(fetchedSettings);
      } catch (error) {
        console.error("Failed to load settings for login page:", error);
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    };
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    if (!hasSupabaseEnv) {
      showError("Autenticação indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      return;
    }
    if (settings.maintenanceMode) {
      showError("O sistema está em modo de manutenção. Tente novamente mais tarde.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      const map: Record<string, string> = { "Invalid login credentials": "Credenciais inválidas." };
      showError(map[error.message] || "Não foi possível entrar. Tente novamente.");
    } else {
      showSuccess("Login realizado com sucesso. Redirecionando...");
    }
  };

  const handleReset = async (values: z.infer<typeof resetSchema>) => {
    if (!hasSupabaseEnv) {
      showError("Recuperação indisponível sem configuração do Supabase.");
      return;
    }
    setLoadingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoadingReset(false);

    if (error) {
      showError("Não foi possível enviar as instruções. Tente novamente.");
    } else {
      showSuccess("Se o e-mail existir, enviaremos as instruções de redefinição.");
      resetForm.reset();
    }
  };

  const handleViewChange = (newView: AuthView) => {
    setView(newView);
    if (newView === "forgotten_password") {
      resetForm.reset({ email: "" }); // Resetar o formulário de recuperação
      resetForm.clearErrors();
    } else {
      loginForm.reset({ email: "", password: "" }); // Resetar o formulário de login
      loginForm.clearErrors();
    }
  };

  useEffect(() => {
    document.title = view === "sign_in" ? "Entrar — Valida NR1" : "Recuperar senha — Valida NR1";
  }, [view]);

  if (sessionLoading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" aria-busy="true" aria-live="polite">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      <LoginPromo
        logoUrl={settings.logoNegativeDataUrl || "https://site.validanr1.com.br/assets/logo_negativo_white.png"}
        platformName={settings.platformName}
      />
      <div className="bg-muted/30 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            {logoPrimary ? (
              <img src={logoPrimary} alt={settings.platformName} className="mx-auto h-[60px] w-auto object-contain" />
            ) : (
              <img src="https://fbf643ab170cf8b59974997c7d9a22c0.cdn.bubble.io/cdn-cgi/image/w=192,h=125,f=auto,dpr=1.25,fit=contain/f1754152545015x300104446190593300/Logo%201.png" alt="Valida NR1" width={90} height={60} className="mx-auto h-[60px] w-[90px]" />
            )}
            <p className="mt-2 text-sm text-muted-foreground">{settings.description || "Avaliação de Riscos Psicossociais"}</p>
          </div>

          <Card className="w-full rounded-2xl p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold leading-tight">{view === "sign_in" ? "Acesso à Plataforma" : "Recuperar senha"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{view === "sign_in" ? "Faça login para gerenciar as avaliações" : "Informe seu e-mail para receber instruções"}</p>
            </div>

            {view === "sign_in" ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} autoComplete="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="Sua senha" {...field} className="pr-10" autoComplete="current-password" />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent" onClick={() => setShowPassword((v) => !v)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">{showPassword ? "Esconder senha" : "Mostrar senha"}</span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full rounded-full bg-[#1DB584] text-white hover:bg-[#159a78]" disabled={sessionLoading || loginForm.formState.isSubmitting}>
                    {sessionLoading || loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-3">
                  <FormField
                    key="reset-email-field" // Adicionando a key aqui
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            {...field}
                            autoComplete="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full rounded-full bg-[#1DB584] text-white hover:bg-[#159a78]" disabled={loadingReset}>
                    {loadingReset ? "Enviando..." : "Enviar instruções"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button type="button" onClick={() => handleViewChange(view === "sign_in" ? "forgotten_password" : "sign_in")} className="font-sans text-[16px] font-semibold text-[#009e90] transition-colors hover:text-[#1B365D]">
                {view === "sign_in" ? "Esqueci minha senha" : "Voltar ao login"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;