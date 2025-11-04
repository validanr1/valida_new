import React from 'react';
import { Quote, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import '@/styles/landing.css';

const testimonials = [
  {
    text: "A NR01+ revolucionou nossa gestão de riscos psicossociais. Conseguimos reduzir em 85% o tempo gasto com avaliações e ainda aumentamos significativamente nossa conformidade com a NR-01.",
    author: "Ana Carolina Silva",
    role: "Gerente de RH",
    company: "TechCorp Industrial • 2.500 colaboradores",
    avatar: "👩‍💼"
  },
  {
    text: "Como médico ocupacional, posso afirmar que a plataforma é tecnicamente impecável. Os relatórios são detalhados, auditáveis e seguem rigorosamente as normas técnicas.",
    author: "Dr. Roberto Mendes",
    role: "Médico do Trabalho",
    company: "Clínica OcupaSaúde • Atende 50+ empresas",
    avatar: "👨‍⚕️"
  },
  {
    text: "Oferecemos a NR01+ como solução white-label para nossos clientes. A ferramenta é robusta, intuitiva e nossos clientes ficam impressionados com a qualidade dos relatórios.",
    author: "Marcela Santos",
    role: "Consultora em SST",
    company: "Santos & Associados • Consultoria especializada",
    avatar: "👩‍💻"
  },
];

const Stars = () => (
  <div className="stars">
    ★★★★★
  </div>
);

const ClientTestimonials = () => {
  return (
    <section className="landing-page-container section section-dark">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">O que nossos clientes dizem</h2>
          <p className="section-subtitle">
            Mais de 500 empresas já transformaram sua gestão de riscos psicossociais. Veja alguns depoimentos de quem já usa nossa plataforma.
          </p>
        </div>

        <div className="grid-3">
          {testimonials.map((t, index) => (
            <Card key={index} className="card testimonial-card">
              <div className="testimonial-header">
                <Quote className="h-8 w-8" style={{color: "rgba(29, 181, 132, 0.6)"}} />
                <Stars />
              </div>
              <blockquote className="testimonial-text">“{t.text}”</blockquote>
              <div className="testimonial-author">
                <div className="author-avatar">{t.avatar}</div>
                <div>
                  <div className="author-name">{t.author}</div>
                  <div className="author-role">{t.role}</div>
                  <div className="author-company">{t.company}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientTestimonials;