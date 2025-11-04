import { Card } from "@/components/ui/card";
import { Shield, Zap, Rocket } from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "Fast to Ship",
    desc: "Scaffold, iterate, and launch quicker with polished components.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    desc: "Thoughtful defaults and modern best practices out of the box.",
  },
  {
    icon: Zap,
    title: "Performance First",
    desc: "Lean, responsive UI that feels instant on every device.",
  },
];

const Features = () => {
  return (
    <section id="features" className="border-t">
      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need</h2>
          <p className="mt-3 text-muted-foreground">
            Focus on your product — we’ll handle the UI, UX, and speed.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;