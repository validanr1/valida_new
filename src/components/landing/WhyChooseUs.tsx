import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import '@/styles/landing.css';

const benefits = [
  "Redução de 90% no tempo de avaliação psicossocial",
  "Conformidade automática com NR-01 e ISO 45003",
  "Relatórios auditáveis gerados em tempo real",
  "Dashboard executivo com indicadores estratégicos",
  "Integração com sistemas de RH existentes",
  "Suporte especializado em medicina ocupacional",
  "Algoritmos de IA para prevenção de riscos",
  "Histórico completo para auditorias externas",
  "Notificações inteligentes de não conformidades",
  "Customização completa para sua empresa",
];

const stats = [
  { value: "90%", label: "Redução de tempo" },
  { value: "500+", label: "Empresas ativas" },
  { value: "99.9%", label: "Uptime garantido" },
  { value: "24h", label: "Para implementar" },
];

const WhyChooseUs = () => {
  return (
    <section className="landing-page-container section section-dark">
      <div className="container grid-2">
        <div className="diferenciais-content">
          <h2 className="section-title">Por que escolher a <span className="text-teal">NR01+</span>?</h2>
          <p className="section-subtitle-left">
            Mais de 500 empresas já transformaram sua gestão de riscos psicossociais com nossa plataforma. Veja os principais diferenciais que nos tornam líderes no mercado.
          </p>
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-item">
                <div className="check-icon">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="stats-card">
          <h3 className="stats-title">Resultados Comprovados</h3>
          <p className="stats-subtitle">Métricas de nossos clientes</p>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="stats-rating">
            <div className="rating-value">4.9/5</div>
            <div className="rating-label">Satisfação média dos clientes</div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default WhyChooseUs;