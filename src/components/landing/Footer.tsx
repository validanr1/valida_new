import { MadeWithDyad } from "@/components/made-with-dyad";

const Footer = () => {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Acme, Inc. All rights reserved.
        </p>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
            Testimonials
          </a>
          <a href="#cta" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </nav>
      </div>
      <MadeWithDyad />
    </footer>
  );
};

export default Footer;