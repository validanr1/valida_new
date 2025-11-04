import HeroNeon from "@/components/neon/HeroNeon";
import DemoTabs from "@/components/neon/DemoTabs";
import HelpAI from "@/components/neon/HelpAI";
import AnalystCo from "@/components/neon/AnalystCo";
import Integrations from "@/components/neon/Integrations";
import AfterAnalysis from "@/components/neon/AfterAnalysis";
import Results from "@/components/neon/Results";
import FAQ from "@/components/neon/FAQ";
import CTASection from "@/components/neon/CTASection";
import FooterNeon from "@/components/neon/FooterNeon";
import HeaderNeon from "@/components/neon/HeaderNeon";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeaderNeon />
      <main>
        <HeroNeon />
        <DemoTabs />
        <HelpAI />
        <AnalystCo />
        <Integrations />
        <AfterAnalysis />
        <Results />
        <FAQ />
        <CTASection />
      </main>
      <FooterNeon />
    </div>
  );
};

export default Index;