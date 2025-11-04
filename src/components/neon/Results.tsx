import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
    <div className="bg-gradient-to-br from-[#F9D9FF] via-white to-[#E66BFF] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
      {value}
    </div>
    <div className="mt-1 text-xs text-[#CFCFCF]">{label}</div>
  </div>
);

const Results = () => {
  return (
    <section id="resultados" className="bg-black py-16">
      <div className="container grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden border-white/10 bg-black/40">
          <img src="/placeholder.svg" alt="Palestra" className="h-auto w-full" />
        </Card>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1 text-xs text-white/80">
            <Quote className="h-3.5 w-3.5" /> Resultados reais de clientes
          </div>
          <h3 className="text-2xl font-semibold text-white">Resultados</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat value="+30%" label="de aumento em conversão" />
            <Stat value="6h/sem" label="economizadas pela equipe" />
            <Stat value="+50%" label="de reuniões bem aproveitadas" />
          </div>
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

export default Results;