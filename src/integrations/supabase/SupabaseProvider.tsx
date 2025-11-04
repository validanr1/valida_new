import { createContext, useContext, useEffect, useState, useMemo, useRef, type PropsWithChildren } from "react";
import { syncAndStoreLocalSession, type LocalSession } from "@/services/auth"; // Usar LocalSession
import { supabase } from "@/integrations/supabase/client";

type SessionContextType = {
  session: LocalSession | null; // Usar LocalSession
  loading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
});

export const useSession = () => useContext(SessionContext);

const SupabaseProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<LocalSession | null>(null); // Usar LocalSession
  const [initialLoading, setInitialLoading] = useState(true);
  const isRefreshingRef = useRef(false); // Flag para evitar chamadas concorrentes

  const refreshSession = async (triggerEvent?: string) => {
    if (isRefreshingRef.current) {
      console.log(`[SupabaseProvider] refreshSession: Already refreshing, skipping call triggered by: ${triggerEvent || 'unknown'}`);
      return;
    }
    isRefreshingRef.current = true;
    console.log(`[SupabaseProvider] refreshSession: Started, triggered by: ${triggerEvent || 'initial load'}`);
    
    if (triggerEvent === 'initial load') {
      setInitialLoading(true);
    }

    try {
      const newSession = await syncAndStoreLocalSession();
      
      // Sempre atualiza a sessão para garantir que a UI reflita o estado mais recente
      setSession(newSession);
      
    } catch (err) {
      console.error("[SupabaseProvider] refreshSession: Erro durante a atualização da sessão:", err);
      setSession(null);
    } finally {
      setInitialLoading(false);
      isRefreshingRef.current = false;
      console.log(`[SupabaseProvider] refreshSession: Finished. Final session state: ${session ? 'VALID' : 'NULL'}, initialLoading: false.`);
    }
  };

  useEffect(() => {
    console.log("[SupabaseProvider] useEffect: Component mounted.");
    refreshSession('initial load'); 

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      console.log(`[SupabaseProvider] onAuthStateChange event: ${event}`, supabaseSession);
      
      if (event === 'SIGNED_OUT') {
        console.log("[SupabaseProvider] SIGNED_OUT event detected. Explicitly setting session to null.");
        setSession(null);
        setInitialLoading(false);
      } else if (['SIGNED_IN', 'USER_UPDATED', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
        refreshSession(`onAuthStateChange - ${event}`);
      } else {
        console.log(`[SupabaseProvider] onAuthStateChange: Skipping full refresh for event: ${event}`);
      }
    });

    const handleCompanyChange = () => {
      console.log("[SupabaseProvider] 'company_id_changed' event received.");
      refreshSession('company_id_changed event'); 
    };
    window.addEventListener("company_id_changed", handleCompanyChange);

    return () => {
      console.log("[SupabaseProvider] useEffect: Component unmounting, unsubscribing.");
      authSubscription.unsubscribe();
      window.removeEventListener("company_id_changed", handleCompanyChange);
    };
  }, []); 

  const contextValue = useMemo(() => ({ session, loading: initialLoading }), [session, initialLoading]);
  console.log("[SupabaseProvider] Rendering with context value:", contextValue);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export default SupabaseProvider;