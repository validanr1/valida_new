import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { syncAndStoreLocalSession, signOut } from "@/services/auth"; // Corrigido: import signOut
import LoadingSpinner from "@/components/LoadingSpinner";
import { showError } from "@/utils/toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("[AuthCallback] Effect triggered. Session loading:", sessionLoading, "Session:", session ? "present" : "absent");

      if (sessionLoading) {
        // Still loading Supabase session, wait for it
        console.log("[AuthCallback] Supabase session still loading, waiting...");
        return;
      }

      if (session) {
        console.log("[AuthCallback] Supabase session found. Attempting to sync local session...");
        try {
          const localSession = await syncAndStoreLocalSession();
          if (localSession) {
            console.log("[AuthCallback] Local session synced successfully. Role context:", localSession.roleContext);
            if (localSession.roleContext === "PartnerAdmin") {
              console.log("[AuthCallback] Redirecting to /partner");
              navigate("/partner", { replace: true });
            } else if (localSession.roleContext === "SuperAdmin") {
              console.log("[AuthCallback] Redirecting to /admin");
              navigate("/admin", { replace: true });
            } else {
              console.warn("[AuthCallback] Unknown or unsupported role context:", localSession.roleContext, "Redirecting to login.");
              showError("Contexto de função desconhecido. Por favor, faça login novamente.");
              // If role context is unknown, it's safer to sign out and redirect to login
              await signOut(); // Ensure user is logged out
              navigate("/login", { replace: true });
            }
          } else {
            console.error("[AuthCallback] Failed to sync local session after Supabase session was found. Local session is null.");
            showError("Falha ao processar sua sessão. Por favor, faça login novamente.");
            await signOut(); // Ensure user is logged out
            navigate("/login", { replace: true });
          }
        } catch (error) {
          console.error("[AuthCallback] Error during local session sync:", error);
          showError("Ocorreu um erro ao processar seu login. Por favor, tente novamente.");
          await signOut(); // Ensure user is logged out
          navigate("/login", { replace: true });
        }
      } else {
        console.log("[AuthCallback] No Supabase session found. Redirecting to /login.");
        showError("Sessão não encontrada. Por favor, faça login.");
        navigate("/login", { replace: true });
      }
    };

    handleAuthCallback();
  }, [session, sessionLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size={48} />
      <p className="ml-2 text-muted-foreground">Processando autenticação...</p>
    </div>
  );
};

export default AuthCallback;