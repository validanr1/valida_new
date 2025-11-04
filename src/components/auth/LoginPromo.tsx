import React from 'react';
import { ShieldCheck, BarChart3, FileText } from 'lucide-react';

interface LoginPromoProps {
  logoUrl?: string;
  platformName?: string;
}

const LoginPromo: React.FC<LoginPromoProps> = ({ logoUrl, platformName = "Valida NR1" }) => {
  return (
    <div 
      className="hidden lg:flex flex-col justify-center bg-cover bg-center p-12 relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2070&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 max-w-md mx-auto text-white">
        {logoUrl ? (
          <img src={logoUrl} alt={platformName} className="h-16 w-auto mb-12" />
        ) : (
          <img src="https://site.validanr1.com.br/assets/logo_negativo_white.png" alt={platformName} className="h-16 w-auto mb-12" />
        )}
        <h1 className="text-3xl font-bold leading-tight mb-4">
          Plataforma Completa para Gestão de Riscos Psicossociais
        </h1>
        <p className="text-lg text-gray-300 mb-10">
          Automatize avaliações, gere relatórios detalhados e garanta a conformidade com a NR-01 de forma simples e eficaz.
        </p>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-teal-500/10 p-2 rounded-full">
              <ShieldCheck className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold">Conformidade Garantida</h3>
              <p className="text-gray-400 text-sm">
                Nossas ferramentas são auditáveis e alinhadas com as normas regulamentadoras.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-teal-500/10 p-2 rounded-full">
              <BarChart3 className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold">Análises Inteligentes</h3>
              <p className="text-gray-400 text-sm">
                Dashboards interativos que transformam dados em insights acionáveis.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-teal-500/10 p-2 rounded-full">
              <FileText className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold">Relatórios Automáticos</h3>
              <p className="text-gray-400 text-sm">
                Gere PGR, AET e outros documentos essenciais com apenas alguns cliques.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromo;