import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

const CTASection = () => {
  return (
    <section id="cta" className="bg-black py-12">
      <div className="container text-center">
        <Button
          size="lg"
          className="rounded-full bg-[#E66BFF] px-8 text-black transition-shadow hover:shadow-[0_0_40px_rgba(230,107,255,0.95)] focus-visible:ring-[#E66BFF]"
          onClick={() => { window.location.href = "/#planos"; }}
        >
          Quero testar a plataforma
          <Rocket className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};

export default CTASection;