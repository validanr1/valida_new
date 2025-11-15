import { useEffect, useMemo, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";

type Props = { tipo: "termos"|"privacidade"|"cookies"|"sla"|"lgpd"; title: string; slug: string };

const LegalPage = ({ tipo, title, slug }: Props) => {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from("legal_documents").select("conteudo_html").eq("tipo", tipo).eq("ativo", true).maybeSingle();
      if (mounted) {
        setHtml((data as any)?.conteudo_html || "<p>Documento não disponível.</p>");
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tipo]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) { setHeadings([]); return; }
    const all = Array.from(root.querySelectorAll("h1,h2,h3"));
    const used = new Set<string>();
    const hs: { id: string; text: string }[] = [];
    for (let i = 0; i < all.length && hs.length < 20; i++) {
      const el = all[i] as HTMLElement;
      let id = el.id;
      const text = (el.textContent || "").trim();
      if (!id) {
        let base = text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
        if (!base) base = `sec-${i}`;
        let candidate = base;
        let n = 1;
        while (used.has(candidate)) { candidate = `${base}-${n++}`; }
        id = candidate;
        el.id = id;
      }
      used.add(id);
      hs.push({ id, text });
    }
    setHeadings(hs);
  }, [html]);

  const content = useMemo(() => ({ __html: html }), [html]);

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Início</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="p-4 lg:w-[280px] h-fit lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-160px)] overflow-auto">
          <div className="text-sm font-semibold">Sumário</div>
          <div className="mt-2 flex flex-col gap-2">
            {headings.map((h) => (
              <a key={h.id} href={`#${h.id}`} className="text-sm text-muted-foreground hover:text-foreground">{h.text}</a>
            ))}
            {headings.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma seção detectada.</div>}
          </div>
        </Card>

        <Card className="p-6 flex-1">
          <h1 className="text-2xl font-bold mb-3">{title}</h1>
          {loading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : (
            <div ref={contentRef} className="prose max-w-none dark:prose-invert [&_*]:scroll-mt-24" dangerouslySetInnerHTML={content} />
          )}
        </Card>
      </div>
    </div>
  );
};

export default LegalPage;