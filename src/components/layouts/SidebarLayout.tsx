import { Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  CreditCard,
  Building2,
  FileText,
  Settings,
  ChevronRight,
  User as UserIcon,
  LogOut,
  AlertTriangle,
  UserCog,
  DollarSign,
  Wallet,
  Star,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { getSettings, type PlatformSettings } from "@/services/settings";
import { applyTheme, getTheme, type ThemeMode } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { signOut } from "@/services/auth"; // Corrigido: import signOut
import LoadingSpinner from "@/components/LoadingSpinner";

type UserProfile = { id: string; name: string; email: string; avatar_url?: string };

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#1DB584]/80">
    {children}
  </div>
);

const Item = ({
  active = false,
  icon,
  children,
  to,
  requiredPermission,
  hasPermission,
}: {
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  to: string;
  requiredPermission?: string;
  hasPermission: (permission: string) => boolean;
}) => {
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log(`[SidebarLayout] Item "${children}" hidden due to missing permission: ${requiredPermission}`);
    return null;
  }

  const base =
    "flex h-8 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors";
  const inactiveClasses = "text-white/90 hover:bg-white/10 active:bg-white/15";
  const activeClasses = "bg-[#1DB584] text-white";
  const content = (
    <div className={`${base} ${active ? activeClasses : inactiveClasses}`}>
      <div className={`grid h-5 w-5 place-items-center ${active ? "text-white" : "text-white"}`}>
        {icon}
      </div>
      <span className="truncate">{children}</span>
    </div>
  );

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
};

const SidebarLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const demoMode = (import.meta.env.VITE_DEMO_MODE === 'true') || !hasSupabaseEnv;
  const effectiveSession = demoMode
    ? ({
        roleContext: 'SuperAdmin',
        partnerId: 'demo-partner',
        user: { id: 'demo-user', email: 'admin@demo.local' },
        company_id: 'demo-company',
        permissions: [
          'admin:dashboard:view','admin:partners:read','admin:companies:read','admin:assessments:view','admin:settings:read','admin:users:read','admin:sales:read','admin:subscriptions:read','admin:billing:read','admin:platform_ratings:read'
        ],
      } as any)
    : session;
  const effectiveSessionLoading = demoMode ? false : sessionLoading;
  const [theme, setThemeState] = useState<ThemeMode>(getTheme());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingUserProfile, setLoadingUserProfile] = useState(true);

  useEffect(() => {
    console.log("[SidebarLayout] useEffect: Applying theme:", theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    console.log("[SidebarLayout] useEffect: Fetching platform settings.");
    let mounted = true;
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const fetchedSettings = await getSettings();
        if (mounted) {
          setPlatformSettings(fetchedSettings);
        }
      } catch (error) {
        console.error("[SidebarLayout] useEffect: Falha ao carregar configurações da plataforma:", error);
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    };
    fetchSettings();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    console.log("[SidebarLayout] useEffect: Fetching user profile. Session loading:", effectiveSessionLoading, "Session user ID:", effectiveSession?.user?.id);
    let mounted = true;
    const fetchUserProfile = async () => {
      setLoadingUserProfile(true);
      if (demoMode) {
        if (mounted) setUserProfile({ id: 'demo-user', name: 'Administrador Demo', email: 'admin@demo.local' });
        setLoadingUserProfile(false);
        return;
      }
      if (!effectiveSession?.user?.id) {
        console.log("[SidebarLayout] useEffect: No user ID in session, clearing user profile.");
        if (mounted) setUserProfile(null);
        setLoadingUserProfile(false);
        return;
      }
      try {
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("first_name,last_name,avatar_url")
          .eq("id", effectiveSession.user.id)
          .maybeSingle();

        if (error) {
          console.error("[SidebarLayout] useEffect: Erro ao buscar perfil do usuário:", error);
          if (mounted) setUserProfile(null);
          return;
        }

        const first = prof?.first_name ?? "";
        const last = prof?.last_name ?? "";
        const name = [first, last].filter(Boolean).join(" ") || "Usuário";
        const avatar = (prof && 'avatar_url' in prof ? (prof as any).avatar_url : undefined) ?? (effectiveSession.user as any)?.user_metadata?.avatar_url;
        if (mounted) {
          setUserProfile({ id: effectiveSession.user.id, name, email: effectiveSession.user.email ?? "", avatar_url: avatar });
          console.log("[SidebarLayout] useEffect: User profile loaded:", { id: effectiveSession.user.id, name, email: effectiveSession.user.email ?? "", avatar_url: avatar });
        }
      } catch (error) {
        console.error("[SidebarLayout] useEffect: Falha ao carregar perfil do usuário:", error);
        if (mounted) setUserProfile(null);
      } finally {
        if (mounted) setLoadingUserProfile(false);
      }
    };
    if (!effectiveSessionLoading) {
      fetchUserProfile();
    } else {
      console.log("[SidebarLayout] useEffect: Session still loading, deferring user profile fetch.");
    }
    return () => { mounted = false; };
  }, [effectiveSession?.user?.id, effectiveSession?.user?.email, effectiveSessionLoading]);

  const loadingLayout = effectiveSessionLoading || loadingSettings || loadingUserProfile;
  console.log("[SidebarLayout] Rendering. Loading state:", { effectiveSessionLoading, loadingSettings, loadingUserProfile, loadingLayout });

  const hasPermission = (permission: string) => {
    const has = effectiveSession?.roleContext === "SuperAdmin" || (effectiveSession?.permissions?.includes(permission) ?? false);
    // console.log(`[SidebarLayout] Checking permission "${permission}": ${has}`);
    return has;
  };

  const isAdminDashboard = location.pathname === "/admin";
  const isPartners = location.pathname.startsWith("/admin/parceiros");
  // Do not match '/admin/planos-acao' as 'planos'
  const isActionPlansAdmin = location.pathname.startsWith("/admin/planos-acao");
  const isPlans = location.pathname.startsWith("/admin/planos") && !isActionPlansAdmin;
  const isSales = location.pathname.startsWith("/admin/vendas");
  const isCompanies = location.pathname.startsWith("/admin/empresas");
  const isAssessments = location.pathname.startsWith("/admin/avaliacoes");
  const isDenuncias = location.pathname.startsWith("/admin/denuncias");
  const isSettings = location.pathname.startsWith("/admin/configuracoes");
  const isUserManagement = location.pathname.startsWith("/admin/usuarios");
  const isProfilePage = location.pathname.startsWith("/admin/perfil");
  const isSubscriptions = location.pathname.startsWith("/admin/assinaturas");
  const isBilling = location.pathname.startsWith("/admin/faturamento");
  const isPlatformRatings = location.pathname.startsWith("/admin/platform-ratings");
  // const isLeads = location.pathname.startsWith("/admin/leads");

  useEffect(() => {
    const platformName = platformSettings?.platformName || "Valida NR1";
    let pageName = "Admin";
    if (isAdminDashboard) pageName = "Painel";
    else if (isPartners) pageName = "Parceiros";
    else if (isActionPlansAdmin) pageName = "Planos de Ação (Globais)";
    else if (isPlans) pageName = "Planos";
    else if (isCompanies) pageName = "Empresas";
    else if (isAssessments) pageName = "Avaliações NR1";
    else if (isDenuncias) pageName = "Denúncias";
    else if (isSettings) pageName = "Configurações";
    else if (isUserManagement) pageName = "Usuários";
    else if (isProfilePage) pageName = "Meu perfil";
    else if (isSubscriptions) pageName = "Assinaturas";
    else if (isBilling) pageName = "Faturamento";
    else if (isPlatformRatings) pageName = "Reviews";
    else if (isActionPlansAdmin) pageName = "Planos de Ação (Globais)";
    document.title = `${pageName} — ${platformName}`;
  }, [location.pathname, platformSettings?.platformName, isAdminDashboard, isPartners, isPlans, isCompanies, isAssessments, isDenuncias, isSettings, isUserManagement, isProfilePage, isSubscriptions, isBilling, isPlatformRatings, isActionPlansAdmin]);

  const onLogout = async () => {
    console.log("[SidebarLayout] onLogout called. Initiating signOut.");
    try {
      await signOut(); // Corrigido: chamar signOut
    } catch (error) {
      console.error("[SidebarLayout] Error during signOut:", error);
      // Even if signOut fails, we should still attempt to navigate away
    } finally {
      console.log("[SidebarLayout] Logout complete. Navigating to /login.");
      navigate("/login", { replace: true });
      // Hard redirect as a fallback to ensure state resets across the app
      setTimeout(() => {
        if (location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }, 50);
    }
  };

  const negativeLogo = platformSettings?.logoNegativeDataUrl;

  const footerText = "Five Agância Digital";

  if (loadingLayout) {
    console.log("[SidebarLayout] Rendering loading spinner.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E3A4D] text-white">
        <LoadingSpinner size={32} />
        <p className="ml-2">Carregando...</p>
      </div>
    );
  }

  if (!effectiveSession) {
    console.log("[SidebarLayout] No session found after loading, redirecting to /login.");
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="sticky top-0 h-screen flex flex-col justify-between bg-[#0E3A4D] text-white w-[250px] shrink-0">
        <div className="overflow-y-auto">
          <div className="px-4 pt-5">
            {negativeLogo ? (
              <img
                src={negativeLogo}
                alt={platformSettings?.platformName ?? "Valida NR1"}
                className="h-[52px] w-auto max-w-[160px] object-contain"
              />
            ) : (
              <img
                src="https://fbf643ab170cf8b59974997c7d9a22c0.cdn.bubble.io/cdn-cgi/image/w=96,h=62,f=auto,dpr=1.25,fit=contain/f1754184564688x359118668302162750/Logo%202.png"
                alt="Valida NR1"
                width={80}
                height={52}
                className="h-[52px] w-[80px]"
              />
            )}
          </div>

          <div className="my-4 mx-4 h-px bg-white/20" />

          <SectionTitle>Navegação</SectionTitle>
          <nav className="flex flex-col gap-2 px-3">
            <Item active={isAdminDashboard} to="/admin" icon={<LayoutGrid size={18} />} hasPermission={hasPermission}>Painel</Item>
            <Item active={isPartners} to="/admin/parceiros" icon={<Users size={18} />} requiredPermission="admin:partners:read" hasPermission={hasPermission}>Parceiros</Item>
            <Item active={isPlans} to="/admin/planos" icon={<CreditCard size={18} />} requiredPermission="admin:plans:read" hasPermission={hasPermission}>Planos</Item>
            <Item active={isCompanies} to="/admin/empresas" icon={<Building2 size={18} />} requiredPermission="admin:companies:read" hasPermission={hasPermission}>Empresas</Item>
            <Item active={isUserManagement} to="/admin/usuarios" icon={<UserCog size={18} />} requiredPermission="admin:users:read" hasPermission={hasPermission}>Usuários</Item>
            {effectiveSession?.roleContext !== 'PartnerAdmin' && <Item active={isPlatformRatings} to="/admin/platform-ratings" icon={<Star size={18} />} requiredPermission="admin:platform_ratings:read" hasPermission={hasPermission}>Reviews</Item>}
          </nav>

          <SectionTitle>Ferramentas</SectionTitle>
          <nav className="flex flex-col gap-2 px-3">
            <Item active={isAssessments} to="/admin/avaliacoes" icon={<FileText size={18} />} requiredPermission="admin:assessments:view" hasPermission={hasPermission}>Avaliações NR1</Item>
            <Item active={isDenuncias} to="/admin/denuncias" icon={<AlertTriangle size={18} />} requiredPermission="admin:reports:view" hasPermission={hasPermission}>Denúncias</Item>
            <Item active={isActionPlansAdmin} to="/admin/planos-acao" icon={<FileText size={18} />} requiredPermission="admin:settings:read" hasPermission={hasPermission}>Planos de Ação</Item>
          </nav>

          <SectionTitle>Configurações</SectionTitle>
          <nav className="flex flex-col gap-2 px-3">
            <Item active={isSettings} to="/admin/configuracoes" icon={<Settings size={18} />} requiredPermission="admin:settings:read" hasPermission={hasPermission}>Configurações</Item>
          </nav>
        </div>

        <div className="px-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full rounded-lg p-3 flex items-center gap-3 justify-start transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold">
                      {(userProfile?.name || userProfile?.email || "U").substring(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-semibold">{userProfile?.name ?? "Usuário"}</div>
                  <div className="truncate text-xs text-white/70">{userProfile?.email ?? ""}</div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="text-xs">
                Logado como
                <div className="truncate font-medium">{userProfile?.email ?? "-"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate("/admin/perfil"); }} className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onLogout(); }} className="cursor-pointer text-red-500 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mt-2 text-center text-xs text-white/50">
            <a href="https://fiveagenciadigital.com.br/" target="_blank" rel="noopener noreferrer" className="hover:underline">
              {footerText}
            </a>
            {effectiveSession?.roleContext === 'PartnerAdmin' && (
              <div>
                <a href="https://fiveagenciadigital.com.br/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Five Agência Digital
                </a>
              </div>
            )}
            <div>Versão 1.0.0</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;