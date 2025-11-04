import React from 'react';
import { Compass, BarChart, BrainCircuit, FileText, Lock, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import '@/styles/landing.css';

const features = [
  {
    icon: Compass,
    title: "Diagnóstico Inteligente",
    desc: "Avaliação automatizada dos riscos psicossociais através de questionários adaptativos e análise comportamental avançada.",
  },
  {
    icon: BarChart,
    title: "Monitoramento Contínuo",
    desc: "Dashboard em tempo real com indicadores de conformidade, alertas preventivos e acompanhamento de tendências.",
  },
  {
    icon: BrainCircuit,
    title: "IA Preditiva",
    desc: "Algoritmos inteligentes identificam padrões de risco e sugerem intervenções antes que problemas se manifestem.",
  },
  {
    icon: FileText,
    title: "Relatórios Auditáveis",
    desc: "Documentação completa e automática para auditorias, com histórico detalhado e evidências de conformidade.",
  },
  {
    icon: Lock,
    title: "Segurança Total",
    desc: "Dados criptografados, conformidade LGPD e armazenamento seguro com backup automático e controle de acesso.",
  },
  {
    icon: Plug,
    title: "Integração Simples",
    desc: "API robusta para integração com sistemas existentes, importação de dados e sincronização automática.",
  },
];

const HowItWorks = () => {
  return (
    <section className="landing-page-container section section-dark">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Como funciona a <span className="text-teal">NR01+</span></h2>
          <p className="section-subtitle">
            Nossa plataforma foi desenvolvida com base em 6 pilares fundamentais para garantir a máxima eficiência na gestão de riscos psicossociais.
          </p>
        </div>

        <div className="grid-3">
          {features.map((f, index) => {
            const Icon = f.icon;
            return (
              <Card key={index} className="card">
                <div className="icon-box">
                  <Icon />
                </div>
                <h3 className="card-title">{f.title}</h3>
                <p className="card-text">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;