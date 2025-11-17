import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Index from "./pages/Index"; // Nova página inicial
import LandingPageModelo from "./pages/LandingPageModelo"; // Página antiga, agora como modelo
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SidebarLayout from "./components/layouts/SidebarLayout";
import TopbarLayout from "./components/layouts/TopbarLayout";
import { AdminRoute, PartnerRoute } from "./components/auth/ProtectedRoutes";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Empresas from "./pages/partner/Empresas";
import Colaboradores from "./pages/partner/Colaboradores";
import Partners from "./pages/admin/Partners";
import Plans from "./pages/admin/Plans";
import Companies from "./pages/admin/Companies";
import Assessments from "./pages/admin/Assessments";
import Settings from "./pages/admin/Settings";
import Legal from "./pages/admin/Legal";
import Profile from "./pages/admin/Profile";
import AdminDenuncias from "./pages/admin/Denuncias";
import UserManagement from "./pages/admin/UserManagement";
import { applyTheme } from "./lib/theme";
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerSetores from "./pages/partner/Setores";
import PartnerCargos from "./pages/partner/Cargos";
import PartnerDenuncias from "./pages/partner/Denuncias";
import GruposExposicao from "./pages/partner/GruposExposicao";
import PartnerLinks from "./pages/partner/Links";
import PartnerPerfil from "./pages/partner/Perfil";
import PartnerConfiguracoes from "./pages/partner/Configuracoes";
import PrivacyData from "./pages/partner/PrivacyData";
import SetupMaster from "./pages/SetupMaster";
import AuthCallback from "./pages/AuthCallback";
import SetPassword from "./pages/SetPassword";
import Sales from "./pages/admin/Sales";
import Subscriptions from "./pages/admin/Subscriptions";
import Billing from "./pages/admin/Billing";
import { useSession } from "./integrations/supabase/SupabaseProvider";
import LoadingSpinner from "./components/LoadingSpinner";
import DenunciationForm from "./pages/DenunciationForm";
import EvaluationForm from "./pages/EvaluationForm";
import TrackReport from "./pages/public/TrackReport";
import LegalPage from "./pages/public/LegalPage";
import CookieBanner from "./components/legal/CookieBanner";
import LegalConsentModal from "./components/legal/LegalConsentModal";
// Supabase client will be dynamically imported only if env vars are present

// Novas importações para relatórios
import AssessmentsList from "./pages/partner/AssessmentsList"; // Renomeado
import ReportsOverview from "./pages/partner/ReportsOverview";
import IndividualReport from "./pages/partner/IndividualReport";
import GenerateDemoData from "./pages/partner/GenerateDemoData";
import PlatformRatings from "./pages/admin/PlatformRatings"; // Nova importação
import Leads from "./pages/admin/Leads";
import ReportTemplate2Viewer from "./pages/partner/ReportTemplate2Viewer"; // Nova importação
import NewTemplateReport from "./pages/partner/NewTemplateReport";
import DynamicReportV2 from "./pages/partner/DynamicReportV2";
import ActionPlans from "./pages/partner/ActionPlans";
import PartnerSignup from "./pages/public/PartnerSignup";
import PartnerLead from "./pages/public/PartnerLead";
import Activation from "./pages/partner/Activation";
import Suspended from "./pages/partner/Suspended";
import UiKit from "./pages/UiKit";
import ActionPlansAdmin from "./pages/admin/ActionPlansAdmin";
import Support from "./pages/admin/Support";
import Tasks from "./pages/admin/Tasks";
import TasksWagner from "./pages/admin/TasksWagner";


const queryClient = new QueryClient();

const AppContent = () => {
  const hasSupabaseEnv = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  const { loading: providerLoading } = useSession();
  const sessionLoading = hasSupabaseEnv ? providerLoading : false;

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    let unsub: (() => void) | undefined;
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("[App.tsx] Document became visible. Checking Supabase session directly...");
        try {
          const { supabase } = await import("./integrations/supabase/client");
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error("[App.tsx] Error checking session on visibility change:", error);
          } else {
            console.log("[App.tsx] Direct session check on visibility change:", session ? "Session found" : "No session found", session);
          }
        } catch (err) {
          console.error("[App.tsx] Failed to dynamically import supabase client:", err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    unsub = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (unsub) unsub();
    };
  }, [hasSupabaseEnv]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={48} />
        <p className="ml-2 text-muted-foreground">Carregando aplicação...</p>
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Index />} key="landing-page" /> {/* Rota atualizada para a nova Index */}
        <Route path="/landing-page-modelo" element={<LandingPageModelo />} key="landing-page-modelo" /> {/* Rota para o modelo antigo */}
        <Route path="/login" element={<Login />} key="login" />
        <Route path="/setup-master" element={<SetupMaster />} key="setup-master" />
        <Route path="/auth/callback" element={<AuthCallback />} key="auth-callback" />
        <Route path="/set-password" element={<SetPassword />} key="set-password" />
        <Route path="/denuncia" element={<DenunciationForm />} key="denuncia-form" />
        <Route path="/acompanhar-denuncia" element={<TrackReport />} key="track-report" />
        <Route path="/avaliacao" element={<EvaluationForm />} key="evaluation-form" />
        <Route path="/cadastro-parceiro" element={<PartnerSignup />} key="partner-signup" />
        <Route path="/interesse-parceiro" element={<PartnerLead />} key="partner-lead" />
        <Route path="/ui-kit" element={<UiKit />} key="ui-kit" />
        <Route path="/termos-de-uso" element={<LegalPage tipo="termos" title="Termos de Uso" slug="termos-de-uso" />} key="public-terms" />
        <Route path="/politica-de-privacidade" element={<LegalPage tipo="privacidade" title="Política de Privacidade" slug="politica-de-privacidade" />} key="public-privacy" />
        <Route path="/politica-de-cookies" element={<LegalPage tipo="cookies" title="Política de Cookies" slug="politica-de-cookies" />} key="public-cookies" />
        <Route path="/sla" element={<LegalPage tipo="sla" title="SLA" slug="sla" />} key="public-sla" />
        <Route path="/lgpd" element={<LegalPage tipo="lgpd" title="LGPD" slug="lgpd" />} key="public-lgpd" />

        {/* Rotas do Admin */}
        <Route element={<SidebarLayout />} key="admin-layout">
          <Route path="/admin" element={<AdminRoute requiredPermissions={["admin:dashboard:view"]}><AdminDashboard /></AdminRoute>} key="admin-dashboard" />
          <Route path="/admin/parceiros" element={<AdminRoute requiredPermissions={["admin:partners:read"]}><Partners /></AdminRoute>} key="admin-partners" />
          <Route path="/admin/planos" element={<AdminRoute requiredPermissions={["admin:plans:read"]}><Plans /></AdminRoute>} key="admin-plans" />
          <Route path="/admin/vendas" element={<AdminRoute requiredPermissions={["admin:sales:read"]}><Sales /></AdminRoute>} key="admin-sales" />
          <Route path="/admin/assinaturas" element={<AdminRoute requiredPermissions={["admin:subscriptions:read"]}><Subscriptions /></AdminRoute>} key="admin-subscriptions" />
          <Route path="/admin/faturamento" element={<AdminRoute requiredPermissions={["admin:billing:read"]}><Billing /></AdminRoute>} key="admin-billing" />
          <Route path="/admin/empresas" element={<AdminRoute requiredPermissions={["admin:companies:read"]}><Companies /></AdminRoute>} key="admin-companies" />
          <Route path="/admin/avaliacoes" element={<AdminRoute requiredPermissions={["admin:assessments:view"]}><Assessments /></AdminRoute>} key="admin-assessments" />
          <Route path="/admin/denuncias" element={<AdminRoute requiredPermissions={["admin:reports:view"]}><AdminDenuncias /></AdminRoute>} key="admin-denuncias" />
          <Route path="/admin/configuracoes" element={<AdminRoute requiredPermissions={["admin:settings:read"]}><Settings /></AdminRoute>} key="admin-settings" />
          <Route path="/admin/juridico" element={<AdminRoute requiredPermissions={["admin:settings:read"]}><Legal /></AdminRoute>} key="admin-legal" />
          <Route path="/admin/perfil" element={<AdminRoute><Profile /></AdminRoute>} key="admin-profile" />
          <Route path="/admin/usuarios" element={<AdminRoute requiredPermissions={["admin:users:read"]}><UserManagement /></AdminRoute>} key="admin-usuarios" />
          <Route path="/admin/platform-ratings" element={<AdminRoute requiredPermissions={["admin:platform_ratings:read"]}><PlatformRatings /></AdminRoute>} key="admin-platform-ratings" /> {/* Nova rota */}
          <Route path="/admin/leads" element={<AdminRoute requiredPermissions={["admin:leads:read"]}><Leads /></AdminRoute>} key="admin-leads" />
          <Route path="/admin/planos-acao" element={<AdminRoute requiredPermissions={["admin:settings:read"]}><ActionPlansAdmin /></AdminRoute>} key="admin-action-plans" />
          <Route path="/admin/suporte" element={<AdminRoute requiredPermissions={["admin:dashboard:view"]}><Support /></AdminRoute>} key="admin-support" />
          <Route path="/admin/tarefas" element={<AdminRoute requiredPermissions={["admin:dashboard:view"]}><Tasks /></AdminRoute>} key="admin-tasks" />
          <Route path="/admin/tasks_wagner" element={<TasksWagner />} key="admin-tasks-wagner" />
          {/* Redirect legacy user-management route */}
          <Route path="/admin/user-management" element={<Navigate to="/admin/usuarios" replace />} />
        </Route>

        {/* Rotas do Parceiro */}
        <Route element={<TopbarLayout />} key="partner-layout">
          <Route path="/partner" element={<PartnerRoute requiredPermissions={["partner:dashboard:view"]}><PartnerDashboard /></PartnerRoute>} key="partner-dashboard" />
          <Route path="/partner/painel" element={<PartnerRoute requiredPermissions={["partner:dashboard:view"]}><PartnerDashboard /></PartnerRoute>} key="partner-painel" />
          <Route path="/partner/empresas" element={<PartnerRoute requiredPermissions={["partner:companies:read"]}><Empresas /></PartnerRoute>} key="partner-empresas" />
          <Route path="/partner/setores" element={<PartnerRoute requiredPermissions={["partner:departments:read"]}><PartnerSetores /></PartnerRoute>} key="partner-setores" />
          <Route path="/partner/cargos" element={<PartnerRoute requiredPermissions={["partner:roles:read"]}><PartnerCargos /></PartnerRoute>} key="partner-cargos" />
          <Route path="/partner/colaboradores" element={<PartnerRoute requiredPermissions={["partner:employees:read"]}><Colaboradores /></PartnerRoute>} key="partner-colaboradores" />
          <Route path="/partner/denuncias" element={<PartnerRoute requiredPermissions={["partner:reports:view"]}><PartnerDenuncias /></PartnerRoute>} key="partner-denuncias" />
          <Route path="/partner/grupos-exposicao" element={<PartnerRoute requiredPermissions={["partner:ges:view"]}><GruposExposicao /></PartnerRoute>} key="partner-grupos-exposicao" />
          <Route path="/partner/avaliacoes" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><AssessmentsList /></PartnerRoute>} key="partner-assessments-list" /> {/* Rota para a lista de avaliações */}
          <Route path="/partner/reports/overview" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><ReportsOverview /></PartnerRoute>} key="partner-reports-overview" /> {/* Nova rota para o relatório geral */}
          <Route path="/partner/reports/individual/:assessmentId" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><IndividualReport /></PartnerRoute>} key="partner-individual-report" /> {/* Nova rota para o relatório individual */}
          <Route path="/partner/reports/template2-viewer" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><ReportTemplate2Viewer /></PartnerRoute>} key="partner-report-template2-viewer" /> {/* Nova rota para o segundo modelo de relatório */}
          <Route path="/partner/reports/versao-completa" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><NewTemplateReport /></PartnerRoute>} key="partner-report-versao-completa" />
          <Route path="/partner/reports/dinamico-v2" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><DynamicReportV2 /></PartnerRoute>} key="partner-report-dinamico-v2" />
          <Route path="/partner/planos-acao" element={<PartnerRoute requiredPermissions={["partner:assessments:view"]}><ActionPlans /></PartnerRoute>} key="partner-action-plans" />
          <Route path="/partner/links" element={<PartnerRoute requiredPermissions={["partner:links:view"]}><PartnerLinks /></PartnerRoute>} key="partner-links" />
          <Route path="/partner/perfil" element={<PartnerRoute><PartnerPerfil /></PartnerRoute>} key="partner-perfil" />
          <Route path="/partner/privacidade" element={<PartnerRoute><PrivacyData /></PartnerRoute>} key="partner-privacidade" />
          <Route path="/partner/configuracoes" element={<PartnerRoute requiredPermissions={["partner:settings:manage"]}><PartnerConfiguracoes /></PartnerRoute>} key="partner-configuracoes" />
          <Route path="/partner/ativacao" element={<PartnerRoute><Activation /></PartnerRoute>} key="partner-ativacao" />
          <Route path="/partner/suspenso" element={<PartnerRoute><Suspended /></PartnerRoute>} key="partner-suspenso" />
          <Route path="/partner/generate-demo-data" element={<PartnerRoute><GenerateDemoData /></PartnerRoute>} key="partner-generate-demo-data" />
        </Route>

        <Route path="*" element={<NotFound />} key="not-found" />
      </Routes>
      <CookieBanner />
      <LegalConsentModal />
    </BrowserRouter>
  );
};

const App = () => {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;