import { Card } from "@/components/ui/card";

const Check = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-[#E66BFF] shadow-[0_0_10px_rgba(230,107,255,0.8)]" />
    <span className="text-sm text-[#CFCFCF]">{children}</span>
  </li>
);

const Score = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 p-5">
    <div className="text-xs text-[#CFCFCF]">Nota da Reunião</div>
    <div className="mt-1 text-5xl font-extrabold text-white">84</div>
    <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
      <div className="h-2 w-4/5 rounded-full bg-[#E66BFF] shadow-[0_0_14px_rgba(230,107,255,0.8)]" />
    </div>
  </div>
);

const AfterAnalysis = () => {
  return (
    <section className="bg-black py-16 md:py-24">
      <div className="container grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-black/40 p-6">
          <span className="rounded-full border border-[#E66BFF]/30 bg-[#E66BFF]/10 px-3 py-1 text-xs text-[#F9D9FF]">
            O que recebo depois da análise?
          </span>
          <ul className="mt-4 space-y-3">
            <Check>Checklist claro de melhorias</Check>
            <Check>Tempo falado e velocidade de fala</Check>
            <Check>Análise de qualificação BANT do cliente</Check>
            <Check>Pontos de objeção e próximos passos</Check>
            <Check>Resumo executivo para compartilhar</Check>
          </ul>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Score />
            <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
              <div className="text-sm text-white">Radar de desempenho</div>
              <img src="/placeholder.svg" className="mt-2 w-full opacity-90" alt="Radar" />
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-[#CFCFCF]">
            “Cliente demonstrou interesse e pediu proposta. Foque no ROI e no
            case de referência do setor.”
          </div>
        </Card>
      </div>
    </section>
  );
};

export default AfterAnalysis;