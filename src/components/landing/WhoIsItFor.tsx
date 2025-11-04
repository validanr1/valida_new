import React from 'react';
import { ClipboardList, Stethoscope, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import '@/styles/landing.css';

const targetAudiences = [
  {
    icon: ClipboardList,
    title: "Empresas & RH",
    subtitle: "Para organizações de todos os portes",
    description: "Ideal para departamentos de RH que precisam garantir conformidade com a NR-01, reduzir riscos psicossociais e manter documentação auditável para fiscalizações.",
    features: [
      "Dashboard executivo com KPIs",
      "Relatórios automáticos para auditoria",
      "Integração com sistemas de RH",
      "Controle completo de conformidade",
    ],
    cta: "Implementar na empresa",
  },
  {
    icon: Stethoscope,
    title: "Clínicas de Medicina Ocupacional",
    subtitle: "Para profissionais da saúde ocupacional",
    description: "Ferramenta especializada para médicos e psicólogos ocupacionais que realizam avaliações psicossociais e precisam de documentação técnica robusta.",
    features: [
      "Protocolos médicos validados",
      "Laudos técnicos automáticos",
      "Gestão de múltiplos clientes",
      "Histórico médico completo",
    ],
    cta: "Otimizar clínica",
  },
  {
    icon: Users,
    title: "Consultorias & Parceiros",
    subtitle: "Para consultores especializados",
    description: "Plataforma white-label para consultorias em segurança do trabalho que desejam oferecer soluções digitais premium aos seus clientes.",
    features: [
      "Sistema white-label completo",
      "API para integrações customizadas",
      "Suporte técnico dedicado",
      "Comissões atrativas de revenda",
    ],
    cta: "Ser parceiro",
  },
];

const WhoIsItFor = () => {
  return (
    <section className="landing-page-container section section-dark">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Para quem é a <span className="text-teal">NR01+</span>?</h2>
          <p className="section-subtitle">
            Nossa plataforma foi desenvolvida para atender diferentes perfis de profissionais que lidam com avaliação e gestão de riscos psicossociais.
          </p>
        </div>

        <div className="grid-3">
          {targetAudiences.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <Card key={index} className="card">
                <div className="icon-box">
                  <Icon />
                </div>
                <h3 className="card-title">{audience.title}</h3>
                <p className="card-subtitle">{audience.subtitle}</p>
                <p className="card-text">{audience.description}</p>
                <ul className="card-list">
                  {audience.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
                <Button className="btn btn-hero btn-full mt-auto">{audience.cta}</Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhoIsItFor;