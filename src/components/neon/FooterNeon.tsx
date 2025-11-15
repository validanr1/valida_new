const FooterNeon = () => {
  return (
    <footer className="relative bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-[#E66BFF] to-transparent blur-[2px]"
      />
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-[#CFCFCF] md:flex-row">
        <p>© {new Date().getFullYear()} Coelh — todos os direitos reservados.</p>
        <nav className="flex items-center gap-5">
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          <a href="#cta" className="hover:text-white transition-colors">Começar</a>
          <a href="/politica-de-privacidade" className="hover:text-white transition-colors">Privacidade</a>
        </nav>
      </div>
    </footer>
  );
};

export default FooterNeon;