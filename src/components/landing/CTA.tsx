import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { showError, showSuccess } from "@/utils/toast";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const CTA = () => {
  const [email, setEmail] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "/#planos";
  };

  return (
    <section id="cta" className="border-t">
      <div className="container py-16 md:py-24">
        <Card className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-8 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold tracking-tight">Ready to get started?</h3>
            <p className="mt-2 text-muted-foreground">
              Join free today. No credit card required.
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-72"
            />
            <Button type="submit" className="w-full sm:w-auto">Get started</Button>
          </form>
        </Card>
      </div>
    </section>
  );
};

export default CTA;