import { Card } from "@/components/ui/card";

const Step = ({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) => (
  <Card className="h-full border-white/10 bg-black/40 p-5">
    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E66BFF] font-semibold text-black">
      {n}
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-1 text-sm text-[#CFCFCF]">{text}</p>
    <div className="mt-4 rounded-lg border border-white/10 bg-zinc-900/60 p-4 text-sm text-[#CFCFCF]">
      <span className="font-medium text-white">Exemplo:</span> Preview do painel
      com highlights e próximos passos.
    </div>
  </Card>
);

const AnalystCo = () => {
  return (
    <section className="bg-black py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full border border-[#E66BFF]/30 bg-[#E66BFF]/10 px-3 py-1 text-xs text-[#F9D9FF]">
            Seu novo analista Co
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Seu novo <span className="text-[#E66BFF]">analista Co</span>
          </h2>
          <p className="mt-2 text-[#CFCFCF]">
            Nossa IA é o analista comercial que faltava: participa em segundos,
            aponta o necessário e te ajuda a tomar decisões claras.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Step
            n={1}
            title="Grave sua reunião"
            text="Zoom, Meet, ou onde você preferir. Nós cuidamos do resto."
          />
          <Step
            n={2}
            title="IA analisa e encontra pontos"
            text="Detecta objeções, próximos passos, fit e sentimento."
          />
        </div>

        <div className="mt-4">
          <Card className="border-white/10 bg-black/40 p-5">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E66BFF] font-semibold text-black">
              3
            </div>
            <h3 className="text-lg font-semibold text-white">
              Relatório com pontos de melhoria
            </h3>
            <p className="mt-1 text-sm text-[#CFCFCF]">
              Receba um relatório estruturado com recomendações e um resumo do
              que precisa ser feito para avançar o deal.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
              <div className="flex items-center justify-between text-sm text-white">
                <span>Detalhes da Análise</span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                  Bom resultado
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  Follow-up necessário • Próxima semana
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  Cliente demonstrou interesse no plano trimestral
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <a href="#cta" className="inline-block">
            <div className="rounded-full bg-[#E66BFF] px-6 py-3 font-medium text-black shadow-[0_0_35px_rgba(230,107,255,0.8)]">
              Quero testar a plataforma 🚀
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default AnalystCo;