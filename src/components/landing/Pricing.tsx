import React from 'react';
import { Check } from 'lucide-react';
import '@/styles/landing.css';

const plans = [
  {
    name: "Starter",
    description: "Perfeito para pequenas empresas começando sua jornada de segurança.",
    price: "R$ 97",
    period: "/mês",
    note: "Cobrança mensal",
    features: [
      "Até 50 avaliações por mês",
      "Dashboard básico",
      "Suporte por email",
      "Templates de relatórios",
      "Exportação em PDF"
    ],
    cta: "Começar Agora",
    popular: false
  },
  {
    name: "Professional",
    description: "Ideal para empresas em crescimento que precisam de mais recursos.",
    price: "R$ 197",
    period: "/mês",
    note: "Cobrança mensal",
    features: [
      "Até 200 avaliações por mês",
      "Dashboard avançado",
      "Suporte prioritário",
      "Templates personalizáveis",
      "Exportação em PDF e Excel",
      "Integrações com ERP",
      "API de acesso"
    ],
    cta: "Experimente Grátis",
    popular: true
  },
  {
    name: "Enterprise",
    description: "Solução completa para grandes empresas com necessidades avançadas.",
    price: "R$ 497",
    period: "/mês",
    note: "Cobrança mensal",
    features: [
      "Avaliações ilimitadas",
      "Dashboard personalizado",
      "Suporte dedicado 24/7",
      "Templates sob medida",
      "Exportação em múltiplos formatos",
      "Integrações completas",
      "API completa",
      "Treinamento exclusivo",
      "Consultoria especializada"
    ],
    cta: "Fale com Especialista",
    popular: false
  }
];

const Pricing = () => {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Planos que se adaptam ao seu negócio
          </h2>
          <p className="section-subtitle">
            Escolha o plano ideal para sua empresa e comece a transformar a segurança do trabalho com tecnologia de ponta.
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`pricing-card ${plan.popular ? 'pricing-popular' : ''}`}
            >
              {plan.popular && <div className="popular-badge">Mais Popular</div>}
              
              <div className="pricing-header">
                <h3 className="pricing-name">{plan.name}</h3>
                <p className="pricing-desc">{plan.description}</p>
                <div className="pricing-price">
                  <span className="price-value">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                <p className="pricing-note">{plan.note}</p>
              </div>

              <div className="pricing-features">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="feature">
                    <Check className="w-5 h-5 text-teal-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button className={`btn ${plan.popular ? 'btn-hero' : 'btn-secondary'} btn-full`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Pricing };