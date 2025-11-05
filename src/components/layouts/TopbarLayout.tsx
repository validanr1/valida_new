import { Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import CompanySelect from "@/components/company/CompanySelect";
import { getSettings, type PlatformSettings } from "@/services/settings";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { signOut } from "@/services/auth"; // Corrigido: import signOut
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  LayoutGrid,
  Building2,
  Users as UsersIcon,
  ClipboardList,
  Link2,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  FileText,
  Star,
} from "lucide-react";
import PlatformRatingsCenterDialog from "@/components/partner/PlatformRatingsCenterDialog";

type User = { id: string; name?: string; email?: string; avatar_url?: string };
type Company = { id: string; name: string; assessment_type_id?: string };

const Pill = ({
  active,
  children,
  to,
}: {
  active?: boolean;
  children: React.ReactNode;
  to?: string;
}) => {
  const cls =
    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors";
  const activeCls = "bg-[#1B365D] text-white";
  const inactiveCls = "text-zinc-700 hover:bg-zinc-200";
  if (to) {
    return (
      <Link to={to} className={`${cls} ${active ? activeCls : inactiveCls}`}>
        {children}
      </Link>
    );
  }
  return <span className={`${cls} ${inactiveCls}`}>{children}</span>;
};

const TopbarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: sessionLoading } = useSession();
  const hasSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const demoMode = (import.meta.env.VITE_DEMO_MODE === 'true') || !hasSupabaseEnv;
  const effectiveSession = demoMode
    ? ({
        roleContext: 'PartnerAdmin',
        partnerId: 'demo-partner',
        company_id: 'demo-company',
        user: { id: 'demo-user', email: 'parceiro@demo.local' },
        permissions: ['partner:dashboard:view','partner:companies:read','partner:assessments:view','partner:settings:manage']
      } as any)
    : session;
  const effectiveSessionLoading = demoMode ? false : sessionLoading;
  console.log('[TopbarLayout] bootstrap', { hasSupabaseEnv, demoMode, hasSession: !!effectiveSession, sessionLoading: effectiveSessionLoading });
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [globalPlatformSettings, setGlobalPlatformSettings] = useState<PlatformSettings | null>(null); // Global settings
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentAssessmentTypeName, setCurrentAssessmentTypeName] = useState<string | null>(null);
  const [isWide, setIsWide] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1366 : true);

  useEffect(() => {
    console.log("[TopbarLayout] reviewsOpen state:", reviewsOpen);
  }, [reviewsOpen]);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 1366);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    console.log("[TopbarLayout] useEffect: Component mounted.");
    let mounted = true;
    const loadData = async () => {
      setLoadingLayout(true);
      console.log("[TopbarLayout] loadData: Starting data fetch.");
      try {
        // Fetch global platform settings
        const fetchedGlobalSettings = await getSettings();
        if (mounted) setGlobalPlatformSettings(fetchedGlobalSettings);
        console.log("[TopbarLayout] loadData: Global settings fetched.");

        if (demoMode) {
          if (mounted) setCurrentCompany({ id: 'demo-company', name: 'Empresa Demo' });
        } else if (!effectiveSession?.company_id) {
          console.log("[TopbarLayout] loadData: No company_id in session.");
          if (mounted) setCurrentCompany(null);
        } else {
          console.log("[TopbarLayout] loadData: Fetching company details for ID:", effectiveSession.company_id);
          const { data } = await supabase
            .from("companies")
            .select("id,name,assessment_type_id")
            .eq("id", effectiveSession.company_id)
            .maybeSingle();
          if (mounted) setCurrentCompany((data as Company) ?? null);
          console.log("[TopbarLayout] loadData: Company details fetched:", data);
          const comp = data as Company | null;
          if (comp?.assessment_type_id) {
            const { data: at } = await supabase
              .from("assessment_types")
              .select("name")
              .eq("id", comp.assessment_type_id)
              .maybeSingle();
            if (mounted) setCurrentAssessmentTypeName(((at as any)?.name as string) ?? comp.assessment_type_id ?? null);
          } else if (mounted) {
            setCurrentAssessmentTypeName(null);
          }
        }

        if (demoMode) {
          if (mounted) setUser({ id: 'demo-user', name: 'Parceiro Demo', email: 'parceiro@demo.local' });
          return; // Exit early in demo
        }
        if (!effectiveSession?.user?.id) {
          console.log("[TopbarLayout] loadData: No user ID in session.");
          if (mounted) setUser(null);
          return; // Exit early if no user
        }
        console.log("[TopbarLayout] loadData: Fetching auth user details for ID:", effectiveSession.user.id);
        const { data: ures } = await supabase.auth.getUser();
        const u = ures?.user;
        if (!u || !mounted) {
          console.log("[TopbarLayout] loadData: Auth user not found or component unmounted.");
          if (mounted) setUser(null);
          return;
        }
        console.log("[TopbarLayout] loadData: Fetching profile for user ID:", u.id);
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name,last_name,avatar_url")
          .eq("id", u.id)
          .maybeSingle();
        const first = (prof as any)?.first_name ?? "";
        const last = (prof as any)?.last_name ?? "";
        const name = [first, last].filter(Boolean).join(" ") || "Usuário";
        if (mounted) setUser({ id: u.id, name, email: u.email ?? "", avatar_url: (prof && 'avatar_url' in (prof as any)) ? (prof as any).avatar_url : undefined });
        console.log("[TopbarLayout] loadData: User profile loaded:", user);
      } catch (error) {
        console.error("[TopbarLayout] loadData: Failed to load topbar data:", error);
      } finally {
        if (mounted) setLoadingLayout(false);
        console.log("[TopbarLayout] loadData: Finished data fetch. LoadingLayout:", false);
      }
    };
    if (!effectiveSessionLoading) {
      console.log("[TopbarLayout] useEffect: Session not loading, initiating loadData.");
      loadData();
    } else {
      console.log("[TopbarLayout] useEffect: Session still loading, waiting.");
    }
    return () => {
      mounted = false;
      console.log("[TopbarLayout] useEffect: Component unmounting.");
    };
  }, [effectiveSession?.user?.id, effectiveSession?.company_id, effectiveSessionLoading, effectiveSession?.partnerPlatformName, globalPlatformSettings?.platformName]); // Adicionado dependências para white label

  // Determine which settings to use (partner's white label or global)
  const effectivePlatformName = session?.partnerPlatformName ?? globalPlatformSettings?.platformName ?? "Valida NR1";
  const effectiveLogoPrimaryDataUrl = session?.partnerLogoPrimaryDataUrl ?? globalPlatformSettings?.logoPrimaryDataUrl;

  const isPainel = location.pathname === "/partner" || location.pathname.startsWith("/partner/painel");
  const isEmpresas = location.pathname.startsWith("/partner/empresas");
  const isSetores = location.pathname.startsWith("/partner/setores");
  const isCargos = location.pathname.startsWith("/partner/cargos");
  const isColabs = location.pathname.startsWith("/partner/colaboradores");
  const isDenuncias = location.pathname.startsWith("/partner/denuncias");
  const isGES = location.pathname.startsWith("/partner/ges");
  const isAvaliacoes = location.pathname.startsWith("/partner/avaliacoes");
  const isRelatorios = location.pathname.startsWith("/partner/reports");
  const isLinks = location.pathname.startsWith("/partner/links");

  const navItems = useMemo(() => {
    const items = [
      { label: "Painel", to: "/partner", active: isPainel },
      { label: "Empresas", to: "/partner/empresas", active: isEmpresas },
      { label: "Setores", to: "/partner/setores", active: isSetores },
      { label: "Cargos", to: "/partner/cargos", active: isCargos },
      { label: "Colaboradores", to: "/partner/colaboradores", active: isColabs },
      { label: "Denúncias", to: "/partner/denuncias", active: isDenuncias },
    ];
    const t = (currentAssessmentTypeName || "").toUpperCase();
    if (t.includes("GHE")) {
      items.push({ label: "GHE", to: "/partner/ges", active: isGES } as any);
    } else if (t.includes("GES")) {
      items.push({ label: "GES", to: "/partner/ges", active: isGES } as any);
    }
    items.push(
      { label: "Relatórios", to: "/partner/reports/overview", active: isRelatorios } as any,
      { label: "Links", to: "/partner/links", active: isLinks } as any,
    );
    return items;
  }, [isPainel, isEmpresas, isSetores, isCargos, isColabs, isDenuncias, isGES, isAvaliacoes, isRelatorios, isLinks, currentAssessmentTypeName]);

  const onLogout = async () => {
    console.log("[TopbarLayout] onLogout called. Initiating signOut.");
    try {
      await signOut(); // Corrigido: chamar signOut
    } catch (error) {
      console.error("[TopbarLayout] Error during signOut:", error);
      // Even if signOut fails, we should still attempt to navigate away
    } finally {
      console.log("[TopbarLayout] Logout complete. Navigating to /login.");
      navigate("/login", { replace: true }); // Usando navigate do React Router
    }
  };

  const goProfile = () => navigate("/partner/perfil");
  const goSettings = () => navigate("/partner/configuracoes");
  const goDashboard = () => navigate("/partner");
  const goCompanies = () => navigate("/partner/empresas");
  const goEmployees = () => navigate("/partner/colaboradores");
  const goAssessments = () => navigate("/partner/avaliacoes");
  const goReports = () => navigate("/partner/reports/overview");
  const goLinks = () => navigate("/partner/links");

  const userInitial = (user?.name || user?.email || "U").substring(0, 1).toUpperCase();

  if (effectiveSessionLoading || loadingLayout) {
    console.log("[TopbarLayout] Rendering loading state. sessionLoading:", effectiveSessionLoading, "loadingLayout:", loadingLayout);
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <LoadingSpinner size={32} />
        <p className="ml-2 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Se a sessão não existe após o carregamento, redireciona para o login (exceto em demo)
  if (!effectiveSession && !demoMode) {
    console.log("[TopbarLayout] No session found after loading, redirecting to /login.");
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-20 md:h-24 items-center justify-between gap-4 px-4 md:px-6 py-2">
          <Link to="/partner" className="flex h-full items-center">
            {effectiveLogoPrimaryDataUrl ? (
              <img
                src={effectiveLogoPrimaryDataUrl}
                alt={effectivePlatformName}
                className="block h-[80%] w-auto object-contain"
              />
            ) : (
              <span className="text-xl md:text-2xl font-semibold">{effectivePlatformName}</span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-2 rounded-full bg-zinc-100 px-2 py-1">
            {navItems.map((it) => (
              <Pill key={it.label} to={it.to} active={it.active}>
                {it.label}
              </Pill>
            ))}
            <div className="ml-1">
              <CompanySelect />
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg border px-2 py-1.5 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-zinc-700">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold">{userInitial}</span>
                    )}
                  </div>
                  {isWide && (
                    <div className="text-left">
                      <div className="truncate text-sm font-semibold text-zinc-800">
                        {user?.name ?? "Usuário"}
                      </div>
                      <div className="truncate text-xs text-zinc-500 max-w-[180px]">
                        {user?.email ?? ""}
                      </div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-200">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-700">{userInitial}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{user?.name ?? "Usuário"}</div>
                      <div className="truncate text-xs text-zinc-500">{user?.email ?? ""}</div>
                    </div>
                    {session?.roleContext ? (
                      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 border">
                        {session.roleContext}
                      </span>
                    ) : null}
                  </div>
                </div>

                <DropdownMenuSeparator />

                <div className="grid grid-cols-2 gap-2 px-2 py-2">
                  <DropdownMenuItem onClick={goDashboard} className="cursor-pointer rounded-lg">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Painel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={goCompanies} className="cursor-pointer rounded-lg">
                    <Building2 className="mr-2 h-4 w-4" />
                    Empresas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={goEmployees} className="cursor-pointer rounded-lg">
                    <UsersIcon className="mr-2 h-4 w-4" />
                    Colaboradores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={goAssessments} className="cursor-pointer rounded-lg">
                    <FileText className="mr-2 h-4 w-4" />
                    Avaliações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={goReports} className="cursor-pointer rounded-lg">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Relatórios
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={goLinks} className="cursor-pointer rounded-lg">
                    <Link2 className="mr-2 h-4 w-4" />
                    Links
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={goProfile} className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={goSettings} className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                {effectiveSession?.roleContext === 'SuperAdmin' && (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setUserMenuOpen(false);
                      setTimeout(() => setReviewsOpen(true), 0);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setUserMenuOpen(false);
                      setTimeout(() => setReviewsOpen(true), 0);
                    }}
                    className="cursor-pointer"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Review
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600 focus:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
                {effectiveSession?.roleContext === 'PartnerAdmin' && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-center text-zinc-500">
                      <a href="https://fiveagenciadigital.com.br/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Five Agência Digital
                      </a>
                      <div>Versão 1.0.0</div>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="md:hidden border-t border-zinc-200 bg-white">
          <div className="px-4">
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {navItems.map((it) => (
                <Pill key={it.label} to={it.to} active={it.active}>
                  {it.label}
                </Pill>
              ))}
              <CompanySelect />
            </div>
          </div>
        </div>
      </header>

      {currentCompany ? (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="rounded-2xl border border-zinc-200 bg-white/95 px-4 py-2 text-sm shadow-md">
            <span className="text-zinc-500">Empresa selecionada: </span>
            <span className="font-medium text-zinc-800">{currentCompany.name}</span>
          </div>
        </div>
      ) : null}

      <main className="px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm">
          <Outlet />
        </div>
      </main>
      {/* Reviews modal */}
      <PlatformRatingsCenterDialog open={reviewsOpen} onOpenChange={setReviewsOpen} />
    </div>
  );
};

export default TopbarLayout;