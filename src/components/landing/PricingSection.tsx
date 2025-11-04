import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import '@/styles/landing.css';
import { getSettings } from '@/services/settings';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  period: string;
  limits: {
    companies?: number;
    active_employees?: number;
    active_assessments?: number;
  } | null;
  total_price: number | null;
  badge: string | null;
};

const PricingSection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whats, setWhats] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('id, name, description, period, limits, total_price, badge')
          .eq('status', 'active')
          .order('total_price', { ascending: true });

        if (error) {
          throw error;
        }
        setPlans(data || []);
        // Load support WhatsApp from settings for CTA
        try {
          const s = await getSettings();
          setWhats(s.supportWhatsapp || null);
        } catch {}
      } catch (err: any) {
        console.error("Error fetching plans:", err);
        setError("Não foi possível carregar os planos. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "Consulte";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'monthly':
        return '/mês';
      case 'quarterly':
        return '/trimestre';
      case 'semiannual':
        return '/semestre';
      case 'yearly':
        return '/ano';
      default:
        return '';
    }
  };

  const getButtonVariant = (badge: string | null) => {
    return badge ? 'hero' : 'secondary';
  };

  const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
  const formatWhats = (phone?: string | null) => {
    if (!phone) return null;
    const d = onlyDigits(phone);
    if (!d) return null;
    // Ensure country code 55
    const withCountry = d.startsWith('55') ? d : `55${d}`;
    return withCountry;
  };
  const buildWhatsAppLink = (plan: Plan) => {
    const number = formatWhats(whats);
    const priceText = plan.total_price !== null && plan.total_price !== undefined ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.total_price) : 'Consultar';
    const periodText = getPeriodText(plan.period);
    const msg = `Olá! Tenho interesse no plano ${plan.name} (${priceText} ${periodText}). Pode me orientar sobre a contratação?`;
    const urlMsg = encodeURIComponent(msg);
    if (number) return `https://wa.me/${number}?text=${urlMsg}`;
    // Fallback to web app without number (user escolhe contato)
    return `https://wa.me/?text=${urlMsg}`;
  };

  if (loading) {
    return (
      <section className="landing-page-container section section-dark">
        <div className="container flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner size={48} />
          <p className="mt-4 text-lg text-gray-300">Carregando planos...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="landing-page-container section section-dark">
        <div className="container flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-lg text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="landing-page-container section section-dark">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Escolha seu <span className="text-teal">plano ideal</span></h2>
          <p className="section-subtitle">
            Soluções flexíveis para empresas de todos os portes. Comece gratuitamente e escale conforme sua necessidade.
          </p>
        </div>

        {plans.length > 0 ? (
          <>
            <div className="pricing-grid">
              {plans.map((plan) => {
                const isPopular = !!plan.badge;
                const features = [];

                if (plan.limits?.active_assessments) {
                  const limit = plan.limits.active_assessments;
                  const prefix = limit === 1 ? 'Apenas' : 'Até';
                  const text = limit === 1 ? 'avaliação' : 'avaliações';
                  features.push(`${prefix} ${limit} ${text}`);
                } else {
                  features.push(`Avaliações ilimitadas`);
                }
                if (plan.limits?.companies) {
                  const limit = plan.limits.companies;
                  const prefix = limit === 1 ? 'Apenas' : 'Até';
                  const text = limit === 1 ? 'empresa' : 'empresas';
                  features.push(`${prefix} ${limit} ${text}`);
                } else {
                  features.push(`Empresas ilimitadas`);
                }
                if (plan.limits?.active_employees) {
                  const limit = plan.limits.active_employees;
                  const prefix = limit === 1 ? 'Apenas' : 'Até';
                  const text = limit === 1 ? 'colaborador' : 'colaboradores';
                  features.push(`${prefix} ${limit} ${text}`);
                } else {
                  features.push(`Colaboradores ilimitados`);
                }

                return (
                  <div
                    key={plan.id}
                    className={`pricing-card ${isPopular ? 'pricing-popular' : ''}`}
                  >
                    {isPopular && <div className="popular-badge">{plan.badge}</div>}
                    
                    <div className="pricing-header">
                      <h3 className="pricing-name">{plan.name}</h3>
                      <p className="pricing-desc">{plan.description || 'Plano customizado para suas necessidades.'}</p>
                      <div className="pricing-price">
                        <span className="price-value">{formatPrice(plan.total_price)}</span>
                        <span className="price-period">{getPeriodText(plan.period)}</span>
                      </div>
                      <p className="pricing-note">Faturamento {plan.period === 'yearly' ? 'anual' : plan.period === 'quarterly' ? 'trimestral' : plan.period === 'semiannual' ? 'semestral' : 'mensal'}</p>
                    </div>

                    <div className="pricing-features">
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="feature">
                          <Check className="h-5 w-5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <a href={buildWhatsAppLink(plan)} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button className={`btn btn-${getButtonVariant(plan.badge)} btn-full`}>
                        Falar no WhatsApp
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400">
            <p>Nenhum plano disponível no momento. Entre em contato para soluções personalizadas.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;