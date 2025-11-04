import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="container flex flex-col items-center gap-8 py-20 text-center md:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          New: Super-fast onboarding
        </div>

        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Build beautiful apps faster with an elegant toolkit
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
          A modern React starter with delightful UI components to ship your product in days, not weeks.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="#cta">
            <Button size="lg">Start free</Button>
          </a>
          <a href="#features">
            <Button size="lg" variant="secondary">Learn more</Button>
          </a>
        </div>

        <Card className="mx-auto w-full max-w-5xl overflow-hidden border mt-10">
          <img
            src="/placeholder.svg"
            alt="Product screenshot"
            className="h-auto w-full"
          />
        </Card>
      </div>
    </section>
  );
};

export default Hero;