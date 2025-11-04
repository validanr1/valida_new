import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

const HeroNeon = () => {
  return (
    <section className="relative overflow-hidden bg-black">
      {/* Arco de luz no topo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[1200px] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_top,_rgba(230,107,255,0.55),_rgba(249,217,255,0.15)_40%,_transparent_65%)] blur-2xl"
      />
      <div className="container relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center md:py-32">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          <span className="bg-gradient-to-br from-[#F9D9FF] via-white to-[#E66BFF] bg-clip-text text-transparent">
            Seu time pode vender mais (com IA)
          </span>{" "}
          <span className="text-white">sem contratar ninguém</span>
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-[#CFCFCF] md:text-lg">
          Descubra o que está travando as vendas nas reuniões do seu time — e como melhorar com precisão usando IA.
        </p>

        <div className="mt-8">
          <a href="#cta">
            <Button
              size="lg"
              className="group rounded-full bg-[#E66BFF] px-6 text-black transition-shadow hover:shadow-[0_0_35px_rgba(230,107,255,0.9)] focus-visible:ring-[#E66BFF]"
            >
              Quero testar a plataforma
              <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroNeon;