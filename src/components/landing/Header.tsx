import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/styles/landing.css';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    document.body.style.overflow = isMobileMenuOpen ? '' : 'hidden';
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
    
    if (isMobileMenuOpen) {
      closeMenu();
    }
  };

  return (
    <header className={`landing-page-container header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container header-content">
        <a href="/" className="logo">
          <img src="https://site.validanr1.com.br/assets/logo-valida-nr01-DhijrqkH.png" alt="Valida NR01+ Logo" className="logo-img" />
        </a>

        <nav className="nav-desktop">
          <a href="#como-funciona" className="nav-link" onClick={(e) => handleNavClick(e, '#como-funciona')}>Como funciona</a>
          <a href="#diferenciais" className="nav-link" onClick={(e) => handleNavClick(e, '#diferenciais')}>Diferenciais</a>
          <a href="#planos" className="nav-link" onClick={(e) => handleNavClick(e, '#planos')}>Planos</a>
          <a href="#faq" className="nav-link" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
        </nav>

        <div className="header-ctas">
          <Button variant="secondary" className="btn btn-secondary">Ver demonstração</Button>
          <Link to="/login">
            <Button className="btn btn-hero">Começar agora</Button>
          </Link>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <button className="mobile-menu-close" onClick={toggleMobileMenu}>
            <X className="h-6 w-6" />
          </button>
          <nav className="mobile-nav">
            <a href="#como-funciona" className="mobile-nav-link" onClick={(e) => handleNavClick(e, '#como-funciona')}>Como funciona</a>
            <a href="#diferenciais" className="mobile-nav-link" onClick={(e) => handleNavClick(e, '#diferenciais')}>Diferenciais</a>
            <a href="#planos" className="mobile-nav-link" onClick={(e) => handleNavClick(e, '#planos')}>Planos</a>
            <a href="#faq" className="mobile-nav-link" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
          </nav>
          <div className="mobile-nav-ctas">
            <Button variant="secondary" className="btn btn-secondary btn-full" onClick={closeMenu}>Ver demonstração</Button>
            <Link to="/login" className="w-full">
              <Button className="btn btn-hero btn-full" onClick={closeMenu}>Começar agora</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;