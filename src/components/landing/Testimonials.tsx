import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Johnson",
    role: "Founder, Northwind",
    text: "We shipped our MVP in days. The components are rock solid and look fantastic.",
  },
  {
    name: "Priya Sharma",
    role: "PM, Horizon Labs",
    text: "A perfect blend of speed and quality. Our team loves working with this setup.",
  },
  {
    name: "Diego Morales",
    role: "CTO, Lumina",
    text: "Clean, fast, and maintainable. It helped us move 3x faster.",
  },
];

const Stars = () => (
  <div className="flex gap-0.5 text-yellow-500">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="h-4 w-4 fill-yellow-500" />
    ))}
  </div>
);

const Testimonials = () => {
  return (
    <section id="testimonials" className="border-t bg-muted/30">
      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Loved by teams</h2>
          <p className="mt-3 text-muted-foreground">
            Join hundreds of builders creating delightful experiences.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="flex flex-col gap-4 p-6">
              <Stars />
              <p className="text-sm text-muted-foreground">“{t.text}”</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;