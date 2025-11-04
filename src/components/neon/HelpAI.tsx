import { Card } from "@/components/ui/card";
import { MessageSquare, Sparkles } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const radarData = [
  { k: "Descoberta", v: 85 },
  { k: "Objeções", v: 78 },
  { k: "Próximos passos", v: 92 },
  { k: "Fit", v: 80 },
  { k: "Urgência", v: 70 },
];

const Bubble = ({ children }: { children: React.ReactNode }) => (
  <div className="relative ml-8 max-w-sm rounded-xl border border-[#E66BFF]/30 bg-[#E66BFF]/10 px-4 py-3 text-sm text-[#F9D9FF]">
    <div className="absolute -left-6 top-2 flex h-6 w-6 items-center justify-center rounded-md border border-[#E66BFF]/40 bg-[#E66BFF]/15">
      <MessageSquare className="h-3.5 w-3.5 text-[#E66BFF]" />
    </div>
    {children}
  </div>
);

const Donut = ({ value = 85 }: { value?: number }) => {
  const deg = Math.round((value / 100) * 360);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-4">
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#E66BFF ${deg}deg, #222 0deg)`,
        }}
      >
        <div className="h-18 w-18 rounded-full bg-black" />
      </div>
      <div>
        <div className="text-3xl font-bold text-white">{value}%</div>
        <div className="text-xs text-[#CFCFCF]">Índice de eficácia</div>
      </div>
    </div>
  );
};

const HelpAI = () => {
  return (
    <section id="o-que-e" className="bg-black py-16 md:py-24">
      <div className="container grid items-start gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E66BFF]/30 bg-[#E66BFF]/10 px-3 py-1 text-xs text-[#F9D9FF]">
            <Sparkles className="h-3.5 w-3.5 text-[#E66BFF]" /> Nossa IA te
            ajuda
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Nossa IA te ajuda
          </h2>
          <div className="space-y-3">
            <Bubble>O resultado do time está ficando aquém do esperado?</Bubble>
            <Bubble>Como saber de forma objetiva o que está pegando?</Bubble>
            <Bubble>
              A nossa IA analisa as reuniões e mostra exatamente o que melhorar
              — com exemplos do próprio call.
            </Bubble>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:pl-6">
          <Card className="h-64 border-white/10 bg-black/40 p-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="k" tick={{ fill: "#CFCFCF", fontSize: 12 }} />
                  <Radar dataKey="v" stroke="#E66BFF" fill="#E66BFF" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Donut value={85} />
        </div>
      </div>
    </section>
  );
};

export default HelpAI;