import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const BRAND_GREEN = '#16A34A';
const BRAND_PETROL = '#0F3D44';

function classifyRisk(mean) {
  if (mean <= 3) return { label: 'Baixo', bg: '#DCFCE7', fg: BRAND_GREEN };
  if (mean <= 5) return { label: 'Moderado', bg: '#FEF9C3', fg: '#A16207' };
  if (mean <= 7) return { label: 'Alto', bg: '#FFEDD5', fg: '#C2410C' };
  return { label: 'Crítico', bg: '#FEE2E2', fg: '#B91C1C' };
}

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function generateRadarDataUrl(categories) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
      html, body { margin:0; padding:0; }
      #c { width:520px; height:360px; }
    </style>
  </head>
  <body>
    <canvas id="c" width="520" height="360"></canvas>
    <script>
      const labels = ${JSON.stringify(categories.map(c => c.name))};
      const data = ${JSON.stringify(categories.map(c => Number(c.mean) || 0))};
      const ctx = document.getElementById('c').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets: [{
          label: 'Média',
          data,
          fill: true,
          backgroundColor: 'rgba(22,163,74,0.2)',
          borderColor: '${BRAND_GREEN}',
          pointBackgroundColor: '${BRAND_PETROL}',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '${BRAND_PETROL}',
        }]},
        options: { responsive: false, scales: { r: { suggestedMin: 0, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
      });
      setTimeout(() => {
        const url = document.getElementById('c').toDataURL('image/png');
        window.__DATA_URL__ = url;
      }, 200);
    </script>
  </body>
</html>`;
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // wait a bit for chart render
    await page.waitForFunction(() => window.__DATA_URL__ !== undefined, { timeout: 5000 });
    const dataUrl = await page.evaluate(() => window.__DATA_URL__);
    return dataUrl;
  } finally {
    await browser.close();
  }
}

function buildReportHtml({ data, radarImageDataUrl }) {
  const overall = classifyRisk(data.overall.mean);
  const logo = data.logoUrl ? `<img src="${htmlEscape(data.logoUrl)}" alt="Logo" style="height:40px;"/>` : `<div style="height:40px;width:40px;border-radius:8px;background:${BRAND_GREEN}"></div>`;
  const categoriesRows = data.categories.map((c, idx) => {
    return `<tr style="background:${idx % 2 === 0 ? '#ffffff' : '#FAFAFA'}">
      <td style="padding:8px;border:1px solid #e5e7eb;">${htmlEscape(c.name)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${Number(c.mean).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${htmlEscape(c.risk)}</td>
    </tr>`;
  }).join('');
  const sectorTable = data.sectors && data.sectors.length > 1 ? `
    <h3 class="text-base font-semibold mb-2">Análise por Setor</h3>
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-zinc-100">
          <th class="text-left p-2 border border-zinc-200">Setor</th>
          <th class="text-left p-2 border border-zinc-200">Média</th>
          <th class="text-left p-2 border border-zinc-200">Risco</th>
        </tr>
      </thead>
      <tbody>
        ${data.sectors.map((s, idx) => `
          <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}">
            <td class="p-2 border border-zinc-200">${htmlEscape(s.sector)}</td>
            <td class="p-2 border border-zinc-200">${Number(s.mean).toFixed(2)}</td>
            <td class="p-2 border border-zinc-200">${htmlEscape(s.risk)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  ` : '';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; }
      @page { size: A4; margin: 24mm 16mm; }
      .brand-petrol { color: ${BRAND_PETROL}; }
      .badge { border-radius: 9999px; padding: 2px 10px; font-weight: 600; }
    </style>
    <title>Relatório de Avaliação</title>
  </head>
  <body class="text-zinc-900">
    <header class="flex items-center justify-between border-b pb-4 mb-6">
      <div class="flex items-center gap-3">
        ${logo}
        <div>
          <h1 class="text-xl font-bold brand-petrol">Avalia NR1</h1>
          <p class="text-sm text-zinc-600">Relatório de Avaliação Psicossocial</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-sm font-medium">${htmlEscape(data.company.name)}</p>
        <p class="text-xs text-zinc-600">CNPJ: ${htmlEscape(data.company.cnpj)}</p>
        <p class="text-xs text-zinc-600">Período: ${htmlEscape(data.assessment.period.start)} — ${htmlEscape(data.assessment.period.end)}</p>
      </div>
    </header>

    <section class="mb-6">
      <h2 class="text-lg font-semibold brand-petrol mb-2">Resumo Executivo</h2>
      <div class="flex items-center justify-between rounded border p-4">
        <div>
          <p class="text-sm text-zinc-600">Média Geral</p>
          <p class="text-3xl font-bold">${Number(data.overall.mean).toFixed(2)}</p>
        </div>
        <div>
          <span class="badge" style="background:${overall.bg}; color:${overall.fg}">${overall.label}</span>
        </div>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-lg font-semibold brand-petrol mb-2">Médias por Categoria</h2>
      ${radarImageDataUrl ? `<img src="${radarImageDataUrl}" alt="Gráfico de Radar" style="width:100%;max-width:520px;"/>` : '<div class="text-sm text-zinc-600">[Gráfico indisponível]</div>'}
    </section>

    <section class="mb-6">
      <h3 class="text-base font-semibold mb-2">Detalhamento</h3>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-zinc-100">
            <th class="text-left p-2 border border-zinc-200">Categoria</th>
            <th class="text-left p-2 border border-zinc-200">Média</th>
            <th class="text-left p-2 border border-zinc-200">Risco</th>
          </tr>
        </thead>
        <tbody>
          ${categoriesRows}
        </tbody>
      </table>
    </section>

    ${sectorTable}

    <footer class="mt-8 pt-4 border-t text-xs text-zinc-600 flex items-center justify-between">
      <span>Gerado em ${htmlEscape(data.generatedAt)}</span>
      <span class="brand-petrol">Assinatura Digital • Avalia NR1</span>
    </footer>
  </body>
</html>`;
}

async function main() {
  // Dados de exemplo
  const data = {
    company: { name: 'Empresa Exemplo LTDA', cnpj: '12.345.678/0001-99' },
    assessment: { title: 'Avaliação NR-1 2025', period: { start: '2025-10-01', end: '2025-10-15' } },
    overall: { mean: 5.8, risk: 'Alto' },
    categories: [
      { name: 'Carga de Trabalho', mean: 6.2, risk: 'Alto' },
      { name: 'Controle', mean: 5.1, risk: 'Moderado' },
      { name: 'Suporte Social', mean: 4.3, risk: 'Moderado' },
      { name: 'Ambiente/Clima', mean: 7.2, risk: 'Crítico' },
    ],
    sectors: [
      { sector: 'Operações', mean: 6.4, risk: 'Alto' },
      { sector: 'Administrativo', mean: 4.9, risk: 'Moderado' },
      { sector: 'Comercial', mean: 5.7, risk: 'Alto' },
    ],
    generatedAt: new Date().toLocaleString('pt-BR'),
    logoUrl: 'https://dummyimage.com/160x40/16A34A/ffffff&text=Avalia+NR1',
  };

  // Gera a imagem do radar
  const radarImageDataUrl = await generateRadarDataUrl(data.categories);

  // Monta HTML completo
  const html = buildReportHtml({ data, radarImageDataUrl });

  // Gera PDF com Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputDir = path.resolve(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'report-sample.pdf');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '24mm', bottom: '24mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: false,
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    console.log('PDF gerado em:', outputPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
