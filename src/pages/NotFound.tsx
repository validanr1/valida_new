import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404: rota não encontrada:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full mx-4">
        <div className="text-center space-y-8">
          {/* Logo e título do erro */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                ERRO
              </h1>
              
              {/* Gráfico 404 estilizado */}
              <div className="flex items-center justify-center space-x-2 my-6">
                <span className="text-8xl font-bold text-[#1B365D] dark:text-blue-400">4</span>
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-[#1B365D] dark:border-blue-400 rounded-full flex items-center justify-center">
                    <div className="space-y-1">
                      <div className="w-2 h-2 bg-[#1B365D] dark:bg-blue-400 rounded-full"></div>
                      <div className="w-6 h-1 bg-[#1B365D] dark:bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <span className="text-8xl font-bold text-[#1B365D] dark:text-blue-400">4</span>
              </div>
            </div>
          </div>

          {/* Mensagem de erro */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
              Página não encontrada
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Não conseguimos encontrar a página que você está procurando!
              <br />
              <span className="text-sm text-slate-500 dark:text-slate-500 mt-2 block">
                Verifique se o endereço está correto ou retorne à página inicial.
              </span>
            </p>
            
            {location.pathname !== '/' && (
              <div className="pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md inline-block">
                  {location.pathname}
                </p>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Voltar
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              className="bg-[#1B365D] hover:bg-[#2C5282] text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Página Inicial
            </Button>
          </div>

          {/* Rodapé */}
          <div className="pt-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              © 2025 – Valida NR1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;