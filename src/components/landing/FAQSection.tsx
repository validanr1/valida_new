import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import '@/styles/landing.css';

const faqs = [
  {
    question: "Como a NR01+ garante conformidade com a NR-01 e ISO 45003?",
    answer: "Nossa plataforma foi desenvolvida por especialistas em medicina ocupacional e segurança do trabalho, seguindo rigorosamente todas as diretrizes da NR-01 e ISO 45003. Todos os questionários, algoritmos e relatórios são validados por profissionais certificados e atualizados automaticamente conforme mudanças nas normas."
  },
  {
    question: "Quanto tempo leva para implementar a plataforma na minha empresa?",
    answer: "A implementação é surpreendentemente rápida! Em até 24 horas sua empresa estará operando com a NR01+. Isso inclui configuração inicial, importação de dados de colaboradores, treinamento da equipe e primeiras avaliações. Nossa equipe de especialistas acompanha todo o processo."
  },
  {
    question: "Os dados da minha empresa estão seguros?",
    answer: "Absolutamente! Utilizamos criptografia de nível bancário, armazenamento em nuvem com certificação ISO 27001, backup automático e total conformidade com a LGPD. Todos os dados são processados no Brasil e você mantém total controle sobre eles."
  },
  {
    question: "A plataforma substitui completamente as avaliações manuais?",
    answer: "Sim, nossa IA e algoritmos automatizam 90% do processo de avaliação psicossocial. Porém, mantemos a possibilidade de revisão e validação por profissionais qualificados quando necessário. O resultado é muito mais eficiência sem perder a qualidade técnica."
  },
  {
    question: "Como funciona a integração com sistemas de RH existentes?",
    answer: "Oferecemos API robusta e conectores pré-construídos para os principais sistemas de RH do mercado (SAP, TOTVS, Senior, etc.). A sincronização de dados de colaboradores é automática e em tempo real. Nossa equipe técnica auxilia em toda a integração."
  },
  {
    question: "Posso personalizar os questionários e relatórios?",
    answer: "Sim! Embora tenhamos protocolos padrão validados, você pode customizar questionários, adicionar perguntas específicas da sua empresa e personalizar completamente o layout dos relatórios com sua marca e identidade visual."
  },
  {
    question: "Qual é o diferencial da NR01+ em relação aos concorrentes?",
    answer: "Somos a única plataforma que combina conformidade técnica rigorosa com inteligência artificial avançada. Além disso, oferecemos implementação em 24h, suporte especializado com médicos e psicólogos ocupacionais, e preços 60% mais competitivos que soluções similares."
  },
  {
    question: "Existe período de teste gratuito?",
    answer: "Sim! Oferecemos 14 dias de teste gratuito completo, sem limitações. Você pode avaliar até 50 colaboradores, gerar relatórios reais e testar todas as funcionalidades. Não pedimos cartão de crédito para começar."
  },
];

const FAQSection = () => {
  return (
    <section className="landing-page-container section section-dark">
      <div className="container faq-container">
        <div className="section-header">
          <h2 className="section-title">Perguntas <span className="text-teal">frequentes</span></h2>
          <p className="section-subtitle">
            Esclarecemos as principais dúvidas sobre nossa plataforma. Não encontrou sua pergunta? Entre em contato conosco!
          </p>
        </div>

        <Accordion type="single" collapsible className="accordion">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="accordion-item">
              <AccordionTrigger className="accordion-trigger">{faq.question}</AccordionTrigger>
              <AccordionContent className="accordion-content">
                <div className="pb-4 pt-0">{faq.answer}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;