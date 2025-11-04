import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/SupabaseProvider"; // Import useSession
import LoadingSpinner from "@/components/LoadingSpinner";
import NoCompanySelected from "@/components/partner/NoCompanySelected"; // Importar o novo componente
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  requiredPermissions?: string[];
  children?: React.ReactNode; // Adicionando a prop children
}

const AdminRoute: React.FC<ProtectedRouteProps> = ({ requiredPermissions = [], children }) => {
  const location = useLocation();
  const { session, loading } = useSession(); // Use the reactive session
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const demoMode = (import.meta.env.VITE_DEMO_MODE === 'true') || !hasSupabaseEnv;
  const demoSession: any = demoMode
    ? {
        roleContext: 'SuperAdmin',
        partnerId: 'demo-partner',
        user: { id: 'demo-user' },
        company_id: 'demo-company',
        permissions: ['admin:dashboard:view','admin:partners:read','admin:companies:read','admin:assessments:view','admin:settings:read'],
      }
    : null;
  const effectiveSession = demoMode ? demoSession : session;
  const effectiveLoading = demoMode ? false : loading;
  const requiredRole = "SuperAdmin";

  console.log(`[AdminRoute - ${location.pathname}] Render. Estado: demoMode=${demoMode}, loading=${effectiveLoading}, session=${!!effectiveSession}, roleContext=${effectiveSession?.roleContext}`);

  if (effectiveLoading) {
    console.log(`[AdminRoute - ${location.pathname}] Sessão ainda está carregando, retornando spinner.`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (!effectiveSession) {
    console.log(`[AdminRoute - ${location.pathname}] Nenhuma sessão encontrada, redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  console.log(`[AdminRoute - ${location.pathname}] Usuário logado. RoleContext: ${effectiveSession.roleContext}, RequiredRole: ${requiredRole}`);

  // Se o usuário NÃO é um SuperAdmin, redirecione-o para o dashboard correto.
  if (effectiveSession.roleContext !== requiredRole) {
    const correctDashboard = effectiveSession.roleContext === "PartnerAdmin" ? "/partner" : "/login"; // Se não é admin nem partner, vai para login
    console.log(`[AdminRoute - ${location.pathname}] Contexto de função incorreto (${session.roleContext}), redirecionando para ${correctDashboard}.`);
    return <Navigate to={correctDashboard} replace />;
  }

  // Neste ponto, sabemos que session.roleContext === "SuperAdmin".
  // Para um SuperAdmin, concedemos acesso total às rotas administrativas.
  console.log(`[AdminRoute - ${location.pathname}] SuperAdmin detectado, concedendo acesso.`);
  return children ? <>{children}</> : <Outlet />;
};

const PartnerRoute: React.FC<ProtectedRouteProps> = ({ requiredPermissions = [], children }) => {
  const location = useLocation();
  const { session, loading } = useSession(); // Use the reactive session
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const demoMode = (import.meta.env.VITE_DEMO_MODE === 'true') || !hasSupabaseEnv;
  const demoSession: any = demoMode
    ? {
        roleContext: 'PartnerAdmin',
        partnerId: 'demo-partner',
        user: { id: 'demo-user' },
        company_id: 'demo-company',
        permissions: ['partner:dashboard:view','partner:companies:read','partner:assessments:view','partner:settings:manage'],
      }
    : null;
  const effectiveSession = demoMode ? demoSession : session;
  const effectiveLoading = demoMode ? false : loading;
  const requiredRole = "PartnerAdmin";

  // Busca status do parceiro para bloquear acesso quando não for 'active'
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!effectiveSession?.partnerId || demoMode) {
        if (mounted) setPartnerStatus(demoMode ? 'active' : null);
        return;
      }
      setStatusLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('status')
        .eq('id', effectiveSession.partnerId)
        .maybeSingle();
      if (mounted) {
        if (error) {
          console.error('[PartnerRoute] Falha ao buscar status do parceiro:', error);
          setPartnerStatus(null);
        } else {
          setPartnerStatus(((data as any)?.status as string) ?? null);
        }
        setStatusLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [effectiveSession?.partnerId, demoMode]);

  console.log(`[PartnerRoute - ${location.pathname}] Render. Estado: demoMode=${demoMode}, loading=${effectiveLoading}, session=${!!effectiveSession}, roleContext=${effectiveSession?.roleContext}`);
  console.log(`[PartnerRoute - ${location.pathname}] Session data:`, { 
    roleContext: effectiveSession?.roleContext, 
    partner_id: effectiveSession?.partnerId, // Corrigido para partnerId
    user_id: effectiveSession?.user?.id,
    company_id: effectiveSession?.company_id,
    permissions: effectiveSession?.permissions
  });

  if (effectiveLoading || statusLoading) {
    console.log(`[PartnerRoute - ${location.pathname}] Sessão ainda está carregando, retornando spinner.`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (!effectiveSession) {
    console.log(`[PartnerRoute - ${location.pathname}] Nenhuma sessão encontrada, redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check role context
  if (effectiveSession.roleContext !== requiredRole) {
    if (effectiveSession.roleContext === "SuperAdmin") {
      console.log(`[PartnerRoute - ${location.pathname}] Usuário é SuperAdmin, redirecionando para /admin.`);
      return <Navigate to="/admin" replace />;
    } else {
      // If it's neither PartnerAdmin nor SuperAdmin, it's an invalid role for this route.
      console.log(`[PartnerRoute - ${location.pathname}] Contexto de função inválido (${effectiveSession.roleContext}), redirecionando para /login.`);
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }
  }

  // At this point, session.roleContext === "PartnerAdmin"
  // Now, check for partnerId, which is mandatory for PartnerAdmin routes.
  const partnerIdentifier = effectiveSession.partnerId; // Corrigido para partnerId
  if (!partnerIdentifier) {
    console.log(`[PartnerRoute - ${location.pathname}] PartnerAdmin sem identificador de parceiro (session.partnerId é nulo/indefinido), redirecionando para /login.`);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Se status do parceiro for 'suspended' ou 'inactive', redirecionar para página de bloqueio
  const isActivationPage = location.pathname.startsWith('/partner/ativacao');
  const isSuspendedPage = location.pathname.startsWith('/partner/suspenso');
  
  if (partnerStatus && (partnerStatus === 'suspended' || partnerStatus === 'inactive') && !isSuspendedPage) {
    console.log(`[PartnerRoute - ${location.pathname}] Parceiro com status '${partnerStatus}', redirecionando para /partner/suspenso.`);
    return <Navigate to="/partner/suspenso" replace />;
  }
  
  // Se status for 'pending', redirecionar para página de ativação
  if (partnerStatus && partnerStatus === 'pending' && !isActivationPage) {
    console.log(`[PartnerRoute - ${location.pathname}] Parceiro com status 'pending', redirecionando para /partner/ativacao.`);
    return <Navigate to="/partner/ativacao" replace />;
  }

  // NEW: Check for company_id for PartnerAdmin. If not present, show a message.
  // This applies to all partner routes except the 'Empresas' page itself,
  // where the user is expected to create/select a company.
  const isCompaniesPage = location.pathname.startsWith("/partner/empresas");
  const isGenerateDemoDataPage = location.pathname.startsWith("/partner/generate-demo-data");
  const isProfilePage = location.pathname.startsWith("/partner/perfil");

  if (!effectiveSession.company_id && !isCompaniesPage && !isGenerateDemoDataPage && !isActivationPage && !isSuspendedPage && !isProfilePage) {
    console.log(`[PartnerRoute - ${location.pathname}] PartnerAdmin sem empresa selecionada, exibindo mensagem de 'NoCompanySelected'.`);
    return <NoCompanySelected />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasAnyRequiredPermission = requiredPermissions.some(perm => effectiveSession.permissions?.includes(perm));
    if (!hasAnyRequiredPermission) {
      console.log(`[PartnerRoute - ${location.pathname}] Permissões necessárias ausentes (${requiredPermissions.join(', ')}), redirecionando para /login.`);
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }
  }

  console.log(`[PartnerRoute - ${location.pathname}] Acesso concedido para partner: ${partnerIdentifier}`);
  return children ? <>{children}</> : <Outlet />;
};

export { AdminRoute, PartnerRoute };