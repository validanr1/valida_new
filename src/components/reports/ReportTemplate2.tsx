const reportTemplate2Html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Relatório de Avaliação Psicossocial Detalhado</title>
<style>
:root {
  --brand: #075985;
  --text: #1f2937;
  --muted: #6b7280;
  --bg: #ffffff;
  --soft: #f8fafc;
  --good: #16a34a;
  --regular: #f59e0b;
  --bad: #ef4444;
  --card: #ffffff;
  --border: #e5e7eb;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  color: var(--text);
  background: var(--soft);
  line-height: 1.6;
}
.container {
  max-width: 900px; margin: 32px auto; padding: 0 16px;
}
.header {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px 24px; box-shadow: 0 2px 10px rgba(0,0,0,.04);
}
.header h1 { color: var(--brand); margin: 0 0 4px; font-size: 24px; }
.header p { color: var(--muted); margin: 0; }
.card {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,.04);
}
.card h2 { margin: 0 0 10px; color: var(--brand); font-size: 18px; }
.card h3 { margin: 16px 0 6px; font-size: 16px; color: #0f172a; }
.card p, .card li { font-size: 14px; }
.toc ol { padding-left: 18px; margin: 0; }
.kv { display: grid; grid-template-columns: 220px 1fr; gap: 8px 16px; font-size: 14px; }
.kv div.key { color: var(--muted); }
.table {
  width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 6px;
}
.table th, .table td { border: 1px solid var(--border); padding: 10px; }
.table th { background: var(--brand); color: #fff; text-align: left; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.badge.good { background: rgba(22,163,74,.12); color: var(--good); border: 1px solid rgba(22,163,74,.3) }
.badge.regular { background: rgba(245,158,11,.12); color: var(--regular); border: 1px solid rgba(245,158,11,.3) }
.badge.bad { background: rgba(239,68,68,.12); color: var(--bad); border: 1px solid rgba(239,68,68,.3) }
.bar { position: relative; height: 12px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.bar > span { position: absolute; left: 0; top: 0; bottom: 0; width: 0; }
.bar.good > span { background: var(--good); }
.bar.regular > span { background: var(--regular); }
.bar.bad > span { background: var(--bad); }
.row { display: grid; grid-template-columns: 1fr 100px 120px; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.row:last-child { border-bottom: 0; }
.small { color: var(--muted); font-size: 12px; }
.section-anchor { scroll-margin-top: 100px; }
.print-actions { margin-top: 12px; }
.print-actions button {
  padding: 8px 12px; border-radius: 10px; background: var(--brand); color: #fff; border: none; cursor: pointer;
}
@media print {
  body { background: #fff; }
  .card { box-shadow: none; border: 1px solid #ddd; }
  .print-actions { display: none; }
}
</style>
</head>
<body>
  <div class="container">
    <div class="header card">
      <h1>RELATÓRIO DE AVALIAÇÃO PSICOSSOCIAL DETALHADO</h1>
      <p>Análise de Fatores de Risco no Ambiente de Trabalho</p>
      <div class="print-actions"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>
    </div>

    <div class="card toc">
      <h2 id="sumario" class="section-anchor">Sumário</h2>
      <ol>
        <li>1. Identificação da Empresa</li><li>1.1 Responsáveis Técnicos</li><li>2. Escopo da Avaliação</li><li>3. Referenciais Normativos</li><li>4. Metodologia Aplicada</li><li>5. Fatores de Risco Psicossocial Identificados</li><li>6. Estratégias de Coleta de Dados</li><li>7. Análise Qualitativa e Quantitativa</li><li>8. Resultados Consolidados da Avaliação</li><li>9. Conclusão e Recomendações</li><li>10. Plano de Ação Sugerido</li><li>Anexo I – Detalhamento dos Resultados por Categoria</li><li>Anexo II – Inventário de Perguntas e Respostas</li><li>Anexo III – Monitoramento e Acompanhamento</li>
      </ol>
    </div>

    <div class="card">
      <h2 id="identificacao" class="section-anchor">1. Identificação da Empresa</h2>
      <div class="kv">
        <div class="key">Razão Social</div><div>Tech Solutions Ltda.</div>
        <div class="key">CNPJ</div><div>11.111.111/1111-11</div>
        <div class="key">CNAE</div><div>6204-0/00</div>
        <div class="key">Endereço</div><div>Av. Paulista, 1000, São Paulo - SP</div>
        <div class="key">Setores Avaliados</div><div>Desenvolvimento, Suporte, Comercial</div>
        <div class="key">Data da Avaliação</div><div>20/08/2024</div>
      </div>

      <h3>1.1 Responsáveis Técnicos</h3>
      <ul>
        <li>DR. CARLOS ALMEIDA – Psicólogo Organizacional – CRP 05/12345</li>
        <li>ENG. ANA PAULA – Engenheira de Segurança do Trabalho – CREA 67890</li>
      </ul>
    </div>

    <div class="card">
      <h2 id="escopo" class="section-anchor">2. Escopo da Avaliação</h2>
      <p>Este relatório apresenta os resultados da avaliação dos fatores de riscos psicossociais no ambiente de trabalho da Tech Solutions Ltda., abrangendo os setores de Desenvolvimento, Suporte e Comercial. O objetivo principal é identificar pontos críticos e propor intervenções para a melhoria contínua da saúde mental e bem-estar dos colaboradores, em conformidade com as diretrizes da NR-01 e NR-17.</p><p>A avaliação focou na percepção dos colaboradores sobre aspectos como demandas de trabalho, controle sobre as tarefas, suporte gerencial e de colegas, relacionamentos interpessoais, clareza de papel e gestão de mudanças. Os dados coletados servem como base para o desenvolvimento de um plano de ação estratégico, visando a criação de um ambiente de trabalho mais saudável e produtivo.</p>
    </div>

    <div class="card">
      <h2 id="referenciais" class="section-anchor">3. Referenciais Normativos</h2>
      <ul>
        <li>NR-01: Disposições Gerais e Gerenciamento de Riscos Ocupacionais (GRO).</li><li>NR-17: Ergonomia, com foco na adaptação das condições de trabalho às características psicofisiológicas dos trabalhadores.</li><li>ISO 45003:2021: Gestão de segurança e saúde ocupacional — Diretrizes para a gestão de riscos psicossociais.</li><li>Guia de Informações sobre Fatores Psicossociais Relacionados ao Trabalho (MTE).</li>
      </ul>
    </div>

    <div class="card">
      <h2 id="metodologias" class="section-anchor">4. Metodologia Aplicada</h2>
      <p>A avaliação foi conduzida utilizando a Metodologia SIT - HSE Stress Indicator Tool, uma ferramenta validada para identificar e mensurar riscos psicossociais. O questionário, composto por trinta e cinco perguntas, aborda sete áreas críticas do ambiente de trabalho: Demandas, Controle, Suporte da Gestão, Suporte dos Colegas, Relacionamentos, Clareza de Papel e Gerenciamento de Mudanças.</p>
      <h3>Processo de Avaliação</h3>
      <ul>
        <li>I. Coleta de Dados: Questionário online aplicado individualmente e de forma anônima a todos os colaboradores dos setores avaliados.</li><li>II. Análise e Pontuação: As respostas foram coletadas em uma escala de 5 pontos (Nunca, Raramente, Às vezes, Frequentemente, Sempre) e categorizadas em Favorável (75-100%), Neutro (40-74.99%) e Desfavorável (0-39.99%) para cada fator.</li>
      </ul>
    </div>

    <div class="card">
      <h2 id="fatores-risco" class="section-anchor">5. Fatores de Risco Psicossocial Identificados</h2>
      <p>Os fatores de risco psicossocial identificados e avaliados incluem, mas não se limitam a:</p>
      <ul>
        <li>Excesso de demandas de trabalho e prazos apertados.</li><li>Baixa autonomia e participação nas decisões.</li><li>Falta de apoio gerencial e de colegas.</li><li>Conflitos interpessoais e assédio.</li><li>Ambiguidade de papel e falta de clareza nas expectativas.</li><li>Resistência ou má gestão de mudanças organizacionais.</li><li>Insegurança no emprego e falta de reconhecimento.</li>
      </ul>
    </div>

    <div class="card">
      <h2 id="estrategias-coleta" class="section-anchor">6. Estratégias de Coleta de Dados</h2>
      <p>O questionário foi aplicado de forma online, garantindo a confidencialidade e o anonimato das respostas. A participação foi voluntária, e os dados foram coletados em um período de duas semanas, permitindo que os colaboradores respondessem em seu próprio ritmo e com total privacidade.</p>
    </div>

    <div class="card">
      <h2 id="analise-qualitativa" class="section-anchor">7. Análise Qualitativa e Quantitativa</h2>
      <p>A análise quantitativa foi realizada a partir da tabulação das respostas e cálculo das médias de pontuação para cada pergunta e categoria. A análise qualitativa, por sua vez, interpretou esses dados à luz dos referenciais normativos e das melhores práticas em saúde ocupacional, identificando padrões e áreas de maior vulnerabilidade psicossocial.</p>
    </div>

    <div class="card">
      <h2 id="resultados-consolidados" class="section-anchor">8. Resultados Consolidados da Avaliação – Resumo Geral</h2>
      <table class="table">
        <thead>
          <tr><th>Categoria</th><th>Percentual</th><th>Nível</th><th>Gráfico</th></tr>
        </thead>
        <tbody>
          <tr><td>Demandas</td><td>35.00%</td><td><span class='badge bad'>Ruim</span></td><td><div class='bar bad'><span style='width:35.0%;'></span></div></td></tr>
          <tr><td>Controle</td><td>42.00%</td><td><span class='badge regular'>Regular</span></td><td><div class='bar regular'><span style='width:42.0%;'></span></div></td></tr>
          <tr><td>Apoio da Gestão</td><td>30.00%</td><td><span class='badge bad'>Ruim</span></td><td><div class='bar bad'><span style='width:30.0%;'></span></div></td></tr>
          <tr><td>Suporte dos Colegas</td><td>55.00%</td><td><span class='badge regular'>Regular</span></td><td><div class='bar regular'><span style='width:55.0%;'></span></div></td></tr>
          <tr><td>Relacionamentos</td><td>48.00%</td><td><span class='badge regular'>Regular</span></td><td><div class='bar regular'><span style='width:48.0%;'></span></div></td></tr>
          <tr><td>Clareza de Papel | Função</td><td>38.00%</td><td><span class='badge bad'>Ruim</span></td><td><div class='bar bad'><span style='width:38.0%;'></span></div></td></tr>
          <tr><td>Gerenciamento de Mudanças</td><td>25.00%</td><td><span class='badge bad'>Ruim</span></td><td><div class='bar bad'><span style='width:25.0%;'></span></div></td></tr>
        </tbody>
      </table>
    </div>

    <!-- Detalhes por categoria -->
    
    <div class="card">
      <h2 class="section-anchor">Demandas — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>No trabalho, diferentes grupos exigem de mim, coisas difíceis de conciliar.</div><div class='small'>30.0%</div><div class='bar bad'><span style='width:30.0%;'></span></div></div>
        <div class='row'><div>Tenho prazos impossíveis de serem cumpridos.</div><div class='small'>25.0%</div><div class='bar bad'><span style='width:25.0%;'></span></div></div>
        <div class='row'><div>Tenho que trabalhar muito intensamente.</div><div class='small'>40.0%</div><div class='bar regular'><span style='width:40.0%;'></span></div></div>
        <div class='row'><div>Preciso deixar de lado algumas tarefas porque tenho coisas demais para fazer.</div><div class='small'>35.0%</div><div class='bar bad'><span style='width:35.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Controle — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Posso decidir quando fazer uma pausa.</div><div class='small'>45.0%</div><div class='bar regular'><span style='width:45.0%;'></span></div></div>
        <div class='row'><div>Posso decidir sobre meu ritmo de trabalho.</div><div class='small'>50.0%</div><div class='bar regular'><span style='width:50.0%;'></span></div></div>
        <div class='row'><div>Posso escolher como fazer meu trabalho.</div><div class='small'>35.0%</div><div class='bar bad'><span style='width:35.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Apoio da Gestão — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Recebo retorno sobre os trabalhos que realizo.</div><div class='small'>20.0%</div><div class='bar bad'><span style='width:20.0%;'></span></div></div>
        <div class='row'><div>Posso contar com a ajuda do meu chefe imediato para resolver problemas do trabalho.</div><div class='small'>30.0%</div><div class='bar bad'><span style='width:30.0%;'></span></div></div>
        <div class='row'><div>Meu chefe imediato me motiva no trabalho.</div><div class='small'>45.0%</div><div class='bar regular'><span style='width:45.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Suporte dos Colegas — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Se o trabalho fica difícil, meus colegas me ajudam.</div><div class='small'>60.0%</div><div class='bar good'><span style='width:60.0%;'></span></div></div>
        <div class='row'><div>Recebo a ajuda e o apoio necessário dos meus colegas.</div><div class='small'>50.0%</div><div class='bar regular'><span style='width:50.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Relacionamentos — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Estou sujeito a constrangimentos no trabalho.</div><div class='small'>40.0%</div><div class='bar regular'><span style='width:40.0%;'></span></div></div>
        <div class='row'><div>Existe atrito ou animosidade entre os colegas de trabalho.</div><div class='small'>55.0%</div><div class='bar regular'><span style='width:55.0%;'></span></div></div>
        <div class='row'><div>Estou sujeito a assédio pessoal na forma de palavras ou comportamentos rudes.</div><div class='small'>30.0%</div><div class='bar bad'><span style='width:30.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Clareza de Papel | Função — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Sei claramente o que é esperado de mim no trabalho.</div><div class='small'>30.0%</div><div class='bar bad'><span style='width:30.0%;'></span></div></div>
        <div class='row'><div>Sei como fazer para executar o meu trabalho.</div><div class='small'>45.0%</div><div class='bar regular'><span style='width:45.0%;'></span></div></div>
        <div class='row'><div>Estou ciente quais são os meus deveres e responsabilidades.</div><div class='small'>50.0%</div><div class='bar regular'><span style='width:50.0%;'></span></div></div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="section-anchor">Gerenciamento de Mudanças — Detalhamento dos Resultados</h2>
      <div class="rows">
        <div class='row'><div>Tenho oportunidades suficientes para questionar as chefias sobre mudanças no trabalho.</div><div class='small'>20.0%</div><div class='bar bad'><span style='width:20.0%;'></span></div></div>
        <div class='row'><div>A equipe é sempre consultada sobre mudanças no trabalho.</div><div class='small'>25.0%</div><div class='bar bad'><span style='width:25.0%;'></span></div></div>
      </div>
    </div>
    

    <div class="card">
      <h2 id="conclusao" class="section-anchor">9. Conclusão e Recomendações</h2>
      <p>A avaliação dos fatores de riscos psicossociais na Tech Solutions Ltda. revela a necessidade de atenção imediata em diversas áreas. As categorias "Demandas", "Apoio da Gestão", "Clareza de Papel" e "Gerenciamento de Mudanças" apresentaram pontuações na zona de risco elevado (Ruim), indicando que os colaboradores percebem um ambiente com alta pressão, falta de suporte e clareza, e dificuldades na adaptação a mudanças.</p><p>É fundamental que a empresa desenvolva um plano de ação robusto e multifacetado para abordar esses desafios, priorizando intervenções que melhorem o suporte gerencial, a comunicação interna e a gestão de processos. A negligência desses fatores pode levar a um aumento do estresse ocupacional, impactando negativamente a saúde mental, a produtividade e a retenção de talentos.</p>
    </div>

    <div class="card">
      <h2 id="plano-acao" class="section-anchor">10. Plano de Ação Sugerido</h2>
      <ul>
        <li>Revisar e otimizar a distribuição de demandas de trabalho, estabelecendo metas realistas e promovendo o equilíbrio entre vida profissional e pessoal.</li><li>Implementar programas de capacitação para líderes, focando em habilidades de comunicação, feedback construtivo e gestão de equipes sob pressão.</li><li>Estabelecer canais de comunicação claros e eficazes para que os colaboradores possam expressar suas preocupações e participar das decisões que afetam seu trabalho.</li><li>Desenvolver um plano de gestão de mudanças que inclua comunicação transparente, treinamento e suporte aos colaboradores durante transições.</li><li>Promover ações de bem-estar e saúde mental, como workshops sobre manejo de estresse e acesso a apoio psicológico.</li>
      </ul>
    </div>

    <div class="card">
      <h2 class="section-anchor">Anexos</h2>
      <ul>
        <li>Anexo I – Detalhamento dos Resultados por Categoria</li>
        <li>Anexo II – Inventário de Perguntas e Respostas</li>
        <li>Anexo III – Monitoramento e Acompanhamento</li>
      </ul>
    </div>
  </div>
</body>
</html>
`;

export default reportTemplate2Html;