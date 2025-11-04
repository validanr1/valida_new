const HeaderNeon = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <nav
        className="container flex h-14 items-center justify-between"
      >
        {/* Menu à esquerda */}
        <div className="flex min-w-0 items-center gap-6 overflow-x-auto">
          <a
            href="#o-que-e"
            className="text-[14px] font-light text-[#CFCFCF] transition-colors hover:text-white"
          >
            O que é
          </a>
          <a
            href="#como-funciona"
            className="text-[14px] font-light text-[#CFCFCF] transition-colors hover:text-white"
          >
            Como funciona
          </a>
          <a
            href="#resultados"
            className="text-[14px] font-light text-[#CFCFCF] transition-colors hover:text-white"
          >
            Resultados
          </a>
          <a
            href="#faq"
            className="text-[14px] font-light text-[#CFCFCF] transition-colors hover:text-white"
          >
            FAQ
          </a>
        </div>

        {/* Botão à direita */}
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-[#E66BFF] px-4 py-2 text-[14px] font-light text-white transition-shadow hover:shadow-[0_0_22px_rgba(230,107,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[#E66BFF]"
        >
          Comece agora
        </a>
      </nav>
    </header>
  );
};

export default HeaderNeon;