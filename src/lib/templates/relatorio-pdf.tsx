import React from "react";

export type CategoryMean = {
  name: string;
  mean: number; // 0-10
  risk: "Baixo" | "Moderado" | "Alto" | "Crítico";
};

export type SectorAnalysis = {
  sector: string;
  mean: number;
  risk: "Baixo" | "Moderado" | "Alto" | "Crítico";
};

export type ReportData = {
  company: {
    name: string;
    cnpj: string;
  };
  assessment: {
    title: string;
    period: { start: string; end: string };
  };
  overall: {
    mean: number;
    risk: "Baixo" | "Moderado" | "Alto" | "Crítico";
  };
  categories: CategoryMean[];
  sectors?: SectorAnalysis[];
  generatedAt: string;
  radarImageDataUrl?: string; // opcional: imagem do gráfico gerado previamente
  logoUrl?: string; // opcional: logo da empresa/produto
};

// Cores da marca
const BRAND_GREEN = "#16A34A";
const BRAND_PETROL = "#0F3D44";

export function RelatorioPDF({ data }: { data: ReportData }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; }
          @page { size: A4; margin: 24mm 16mm; }
          .page-break { page-break-after: always; }
          .brand-green { color: ${BRAND_GREEN}; }
          .brand-petrol { color: ${BRAND_PETROL}; }
          .bg-brand-green { background-color: ${BRAND_GREEN}; }
          .bg-brand-petrol { background-color: ${BRAND_PETROL}; }
          .border-brand-petrol { border-color: ${BRAND_PETROL}; }
          .badge { border-radius: 9999px; padding: 2px 10px; font-weight: 600; }
        `}</style>
        <title>Relatório de Avaliação</title>
      </head>
      <body className="text-zinc-900">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 rounded bg-brand-green" />
            )}
            <div>
              <h1 className="text-xl font-bold brand-petrol">Avalia NR1</h1>
              <p className="text-sm text-zinc-600">Relatório de Avaliação Psicossocial</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{data.company.name}</p>
            <p className="text-xs text-zinc-600">CNPJ: {data.company.cnpj}</p>
            <p className="text-xs text-zinc-600">Período: {data.assessment.period.start} — {data.assessment.period.end}</p>
          </div>
        </header>

        {/* Resumo Executivo */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold brand-petrol mb-2">Resumo Executivo</h2>
          <div className="flex items-center justify-between rounded border p-4">
            <div>
              <p className="text-sm text-zinc-600">Média Geral</p>
              <p className="text-3xl font-bold">{data.overall.mean.toFixed(2)}</p>
            </div>
            <div>
              <span
                className="badge"
                style={{
                  backgroundColor:
                    data.overall.risk === "Baixo"
                      ? "#DCFCE7"
                      : data.overall.risk === "Moderado"
                      ? "#FEF9C3"
                      : data.overall.risk === "Alto"
                      ? "#FFEDD5"
                      : "#FEE2E2",
                  color:
                    data.overall.risk === "Baixo"
                      ? BRAND_GREEN
                      : data.overall.risk === "Moderado"
                      ? "#A16207"
                      : data.overall.risk === "Alto"
                      ? "#C2410C"
                      : "#B91C1C",
                }}
              >
                {data.overall.risk}
              </span>
            </div>
          </div>
        </section>

        {/* Radar */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold brand-petrol mb-2">Médias por Categoria</h2>
          {data.radarImageDataUrl ? (
            <img src={data.radarImageDataUrl} alt="Gráfico de Radar" className="w-full max-w-[520px]" />
          ) : (
            <div className="text-sm text-zinc-600">[Gráfico indisponível nesta renderização]</div>
          )}
        </section>

        {/* Tabela por categoria */}
        <section className="mb-6">
          <h3 className="text-base font-semibold mb-2">Detalhamento</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-left p-2 border border-zinc-200">Categoria</th>
                <th className="text-left p-2 border border-zinc-200">Média</th>
                <th className="text-left p-2 border border-zinc-200">Risco</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c, idx) => (
                <tr key={c.name} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                  <td className="p-2 border border-zinc-200">{c.name}</td>
                  <td className="p-2 border border-zinc-200">{c.mean.toFixed(2)}</td>
                  <td className="p-2 border border-zinc-200">{c.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Análise por setor */}
        {data.sectors && data.sectors.length > 1 && (
          <section className="mb-6">
            <h3 className="text-base font-semibold mb-2">Análise por Setor</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="text-left p-2 border border-zinc-200">Setor</th>
                  <th className="text-left p-2 border border-zinc-200">Média</th>
                  <th className="text-left p-2 border border-zinc-200">Risco</th>
                </tr>
              </thead>
              <tbody>
                {data.sectors.map((s, idx) => (
                  <tr key={s.sector} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                    <td className="p-2 border border-zinc-200">{s.sector}</td>
                    <td className="p-2 border border-zinc-200">{s.mean.toFixed(2)}</td>
                    <td className="p-2 border border-zinc-200">{s.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Rodapé */}
        <footer className="mt-8 pt-4 border-t text-xs text-zinc-600 flex items-center justify-between">
          <span>Gerado em {data.generatedAt}</span>
          <span className="brand-petrol">Assinatura Digital • Avalia NR1</span>
        </footer>
      </body>
    </html>
  );
}

export default RelatorioPDF;
