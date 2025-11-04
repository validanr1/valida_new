import React, { useEffect } from 'react';
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import HowItWorks from '../components/landing/HowItWorks';
import WhyChooseUs from '../components/landing/WhyChooseUs';
import WhoIsItFor from '../components/landing/WhoIsItFor';
import ClientTestimonials from '../components/landing/ClientTestimonials';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import FooterSection from '../components/landing/FooterSection';
import '@/styles/landing.css';
import PartnerLeadForm from '@/components/landing/PartnerLeadForm';

const Index = () => {
  useEffect(() => {
    document.title = 'Valida NR1 — Avaliação psicossocial automática e auditável';
  }, []);
  const showPartnerLead = import.meta.env.VITE_SHOW_PARTNER_LEAD === 'true';

  return (
    <div className="landing-page-container">
      <Header />
      <main>
        <HeroSection />
        <div id="como-funciona">
          <HowItWorks />
        </div>
        <div id="diferenciais">
          <WhyChooseUs />
        </div>
        <WhoIsItFor />
        <ClientTestimonials />
        <div id="planos">
          <PricingSection />
        </div>
        {showPartnerLead && (
          <div id="seja-parceiro" className="container mx-auto px-4 py-10">
            <PartnerLeadForm />
          </div>
        )}
        <div id="faq">
          <FAQSection />
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default Index;