import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Phone } from "lucide-react";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { signOut } from "@/services/auth";
import { useNavigate } from "react-router-dom";

const Suspended = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const partnerName = session?.partnerPlatformName || "Parceiro";
  const supportWhatsapp = session?.partnerSupportWhatsapp;
  const supportEmail = session?.profile?.first_name 
    ? `suporte@${session.partnerPlatformName?.toLowerCase().replace(/\s+/g, '')}.com.br`
    : "suporte@validanr1.com.br";

  useEffect(() => {
    document.title = "Acesso Suspenso — Valida NR1";
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Acesso Temporariamente Suspenso</CardTitle>
          <CardDescription className="text-base">
            Sua conta de parceiro está temporariamente inativa ou suspensa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-medium mb-2">Por que estou vendo esta mensagem?</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Sua assinatura pode estar pendente de renovação</li>
              <li>Pode haver pendências administrativas</li>
              <li>O parceiro pode ter sido temporariamente desativado</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">Entre em contato com o suporte:</p>
            
            {supportWhatsapp && (
              <a
                href={`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5 text-green-600" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-green-900">WhatsApp</div>
                  <div className="text-xs text-green-700">{supportWhatsapp}</div>
                </div>
              </a>
            )}

            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5 text-blue-600" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-blue-900">E-mail</div>
                <div className="text-xs text-blue-700">{supportEmail}</div>
              </div>
            </a>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-full"
            >
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Suspended;
