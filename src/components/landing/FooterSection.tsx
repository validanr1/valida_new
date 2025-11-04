import React from 'react';
import '@/styles/landing.css';

const FooterSection = () => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const headerOffset = 80; // Height of the header
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="landing-page-container footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <img src="https://site.validanr1.com.br/assets/logo_negativo_white.png" alt="Valida NR01+ Logo" className="footer-logo" />
            <p className="footer-text">
              Plataforma líder em avaliação psicossocial automática e auditável para conformidade com NR-01 e ISO 45003.
            </p>
          </div>
          <div className="footer-col">
            <h4 className="footer-title">Produto</h4>
            <ul className="footer-links">
              <li><a href="#como-funciona" onClick={(e) => handleNavClick(e, '#como-funciona')}>Como funciona</a></li>
              <li><a href="#diferenciais" onClick={(e) => handleNavClick(e, '#diferenciais')}>Diferenciais</a></li>
              <li><a href="#planos" onClick={(e) => handleNavClick(e, '#planos')}>Planos</a></li>
              <li><a href="#">Integrações</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-title">Empresa</h4>
            <ul className="footer-links">
              <li><a href="#">Sobre nós</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Carreiras</a></li>
              <li><a href="#">Contato</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-title">Suporte</h4>
            <ul className="footer-links">
              <li><a href="#">Central de Ajuda</a></li>
              <li><a href="#">API Docs</a></li>
              <li><a href="#">Status</a></li>
              <li><a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">© {new Date().getFullYear()} Valida NR01+. Todos os direitos reservados.</p>
          <div className="footer-legal">
            <a href="#">Termos de Uso</a>
            <a href="#">Política de Privacidade</a>
            <a href="#">LGPD</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;