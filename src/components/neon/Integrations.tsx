import { Card } from "@/components/ui/card";

const Logo = ({ label }: { label: string }) => (
  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/70 text-sm text-white">
    {label}
  </div>
);

const Integrations = () => {
  return (
    <section className="bg-black py-16">
      <div className="container">
        <Card className="mx-auto max-w-5xl border-white/10 bg-black/40 p-6 md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold text-white">
                Preciso mudar as ferramentas que já uso?
              </h3>
              <p className="mt-2 text-sm text-[#CFCFCF]">
                Não. A gente se adapta ao que você usa: Zoom, Meet, Pipedrive,
                WhatsApp e mais.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Logo label="Zoom" />
              <Logo label="Meet" />
              <Logo label="Pipe" />
              <Logo label="WA" />
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Integrations;