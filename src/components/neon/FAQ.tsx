import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <section id="faq" className="relative bg-black py-16 md:py-24">
      {/* Glow inferior simulando arco */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[360px] w-[1100px] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_bottom,_rgba(230,107,255,0.45),_rgba(249,217,255,0.12)_40%,_transparent_65%)] blur-2xl"
      />
      <div className="container relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Perguntas que ouvimos sempre
            </h2>
            <a href="#cta" className="hidden rounded-full bg-[#E66BFF] px-5 py-2 text-sm font-medium text-black shadow-[0_0_28px_rgba(230,107,255,0.8)] md:block">
              Quero testar a plataforma 🚀
            </a>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Accordion type="single" collapsible className="w-full rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-left text-white">O que é o Coelh? A automação funciona em ao vivo?</AccordionTrigger>
                <AccordionContent className="text-sm text-[#CFCFCF]">
                  A IA analisa automaticamente as reuniões gravadas ou enviadas, gerando insights e próximos passos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger className="text-left text-white">Preciso dar permissões enormes para usar o Coelh?</AccordionTrigger>
                <AccordionContent className="text-sm text-[#CFCFCF]">
                  Não. Conecte apenas o essencial (Zoom/Meet) e escolha os canais que quer analisar.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full rounded-xl border border-white/10 bg-zinc-900/60 p-2">
              <AccordionItem value="q3">
                <AccordionTrigger className="text-left text-white">O que acontece se a conversa acontecer por telefone?</AccordionTrigger>
                <AccordionContent className="text-sm text-[#CFCFCF]">
                  Basta enviar o arquivo de áudio e a IA processa como qualquer outra reunião.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger className="text-left text-white">Os pontos de melhoria consideram nosso contexto?</AccordionTrigger>
                <AccordionContent className="text-sm text-[#CFCFCF]">
                  Sim. O modelo é ajustado ao seu playbook e aprende com as reuniões do seu time.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mt-8 text-center md:hidden">
            <a href="#cta" className="inline-block rounded-full bg-[#E66BFF] px-6 py-3 font-medium text-black shadow-[0_0_35px_rgba(230,107,255,0.8)]">
              Quero testar a plataforma 🚀
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;