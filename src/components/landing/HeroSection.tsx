import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, PlayCircle, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/styles/landing.css';

const HeroSection = () => {
  return (
    <section className="landing-page-container hero-section section-dark">
      <div className="container hero-grid">
        <div className="hero-content">
          <div className="badge">
            <Zap className="h-4 w-4" /> Conformidade NR-01 & ISO 45003
          </div>
          <h1 className="hero-title">
            Acabe com a papelada: avaliação psicossocial automática e auditável
          </h1>
          <p className="hero-subtitle">
            Transforme a gestão de riscos psicossociais da sua empresa com nossa plataforma inteligente. Conformidade garantida com <span className="text-teal">NR-01</span> e <span className="text-teal">ISO 45003</span>, processos automatizados e relatórios auditáveis em tempo real.
          </p>
          <div className="hero-ctas">
            <Link to="/login">
              <Button className="btn btn-hero btn-lg">
                <CheckCircle className="h-5 w-5" /> Criar conta gratuita
              </Button>
            </Link>
            <Button variant="secondary" className="btn btn-secondary btn-lg">
              <PlayCircle className="h-5 w-5" /> Assistir demo
            </Button>
          </div>
          <div className="trust-indicators">
            <div className="trust-item">
              <Shield className="h-5 w-5" /> Dados protegidos LGPD
            </div>
            <div className="trust-item">
              <CheckCircle className="h-5 w-5" /> Auditoria aprovada
            </div>
            <div className="trust-item">
              <Zap className="h-5 w-5" /> Implementação em 24h
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://validanr1.com.br/wp-content/uploads/2025/10/web-system-dashboard-BsZTi5xw-min.jpg" alt="Plataforma NR01+ - Dashboard de gestão de riscos psicossociais" className="dashboard-img" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;