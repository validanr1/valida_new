import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle, MessageSquare } from "lucide-react";

const Msg = ({
  color = "default",
  title,
  text,
}: {
  color?: "green" | "lilac" | "dark" | "default";
  title: string;
  text: string;
}) => {
  const colors =
    color === "green"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : color === "lilac"
        ? "border-[#E66BFF]/30 bg-[#E66BFF]/10"
        : color === "dark"
          ? "border-white/10 bg-zinc-900"
          : "border-white/10 bg-black/40";
  return (
    <div className={`rounded-xl border p-4 ${colors}`}>
      <div className="flex items-center gap-2 text-sm">
        <MessageSquare className="h-4 w-4 text-white/70" />
        <span className="text-white/90">{title}</span>
      </div>
      <p className="mt-2 text-sm text-[#CFCFCF]">{text}</p>
    </div>
  );
};

const Screen = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_0_60px_rgba(230,107,255,0.15)]">
    <div className="pointer-events-none absolute right-2 top-8 h-28 w-2 rounded-full bg-gradient-to-b from-[#E66BFF] to-transparent opacity-70" />
    <div className="grid gap-3 md:grid-cols-2">{children}</div>
    <Card className="mt-4 overflow-hidden border-white/10 bg-black/30">
      <img src="/placeholder.svg" alt="Demonstração" className="h-auto w-full opacity-90" />
    </Card>
  </div>
);

const DemoTabs = () => {
  return (
    <section id="como-funciona" className="bg-black pb-16 pt-4 md:pb-24">
      <div className="container">
        <Tabs defaultValue="calls" className="mx-auto flex max-w-5xl flex-col items-center">
          <TabsList className="rounded-full bg-zinc-900/70 p-1 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50">
            <TabsTrigger value="calls" className="rounded-full data-[state=active]:bg-[#E66BFF] data-[state=active]:text-black">
              Análise de Calls
            </TabsTrigger>
            <TabsTrigger value="objections" className="rounded-full data-[state=active]:bg-[#E66BFF] data-[state=active]:text-black">
              Motivos por Objeção
            </TabsTrigger>
            <TabsTrigger value="bant" className="rounded-full data-[state=active]:bg-[#E66BFF] data-[state=active]:text-black">
              Qualificação BANT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calls" className="w-full">
            <Screen>
              <Msg
                color="green"
                title="Sinal positivo"
                text="O cliente demonstrou interesse em assinar ainda este mês."
              />
              <Msg
                color="lilac"
                title="Ponto de atenção"
                text="Preço foi citado como principal objeção; sugira plano trimestral."
              />
              <Msg
                color="dark"
                title="Resumo do call"
                text="Duração 43min • 3 stakeholders • Próximos passos definidos."
              />
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="text-sm text-[#CFCFCF]">Checklist concluído</div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-4 w-4" /> 6/7
                </div>
              </div>
            </Screen>
          </TabsContent>

          <TabsContent value="objections" className="w-full">
            <Screen>
              <Msg color="lilac" title="Preço" text="Apareceu em 42% das reuniões da semana." />
              <Msg color="dark" title="Tempo" text="18% mencionaram timing ou prioridade." />
              <Msg color="green" title="Ajuste sugerido" text="Script com ROI real e caso de uso setorial." />
              <Msg title="Concorrente" text="Comparação direta com 2 players — treinar respostas." />
            </Screen>
          </TabsContent>

          <TabsContent value="bant" className="w-full">
            <Screen>
              <Msg color="green" title="Budget" text="Cliente tem verba confirmada para Q4." />
              <Msg color="lilac" title="Authority" text="Champion validado; precisa CTO na próxima." />
              <Msg color="dark" title="Need" text="Dor de previsibilidade em pipeline." />
              <Msg title="Timeline" text="Go-live em 6 semanas após assinatura." />
            </Screen>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default DemoTabs;