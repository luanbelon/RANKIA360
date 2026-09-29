import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { brand } from "@shared/brand";
import { DomainAnalyzer } from "@/components/DomainAnalyzer";

type FinalCTAProps = {
  badge?: string;
  title?: ReactNode;
  subtitle?: string;
  idPrefix?: string;
};

export function FinalCTA({
  badge = "DIAGNÓSTICO GRATUITO",
  title = (
    <>
      Descubra seu <span>AI Visibility Score.</span>
    </>
  ),
  subtitle = "Descubra em menos de 1 minuto se o Google e as IAs entendem e recomendam a sua empresa.",
  idPrefix = "final",
}: FinalCTAProps) {
  return (
    <section className="final-cta section-shell">
      <div className="final-cta__glow" aria-hidden="true" />
      <span className="final-cta__orb final-cta__orb--one" />
      <span className="final-cta__orb final-cta__orb--two" />

      <span className="eyebrow final-cta-badge">
        <Sparkles size={15} /> {badge}
      </span>

      <h2>{title}</h2>

      <p className="final-cta-sub">{subtitle}</p>

      <DomainAnalyzer idPrefix={idPrefix} />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__main section-shell">
        <div className="footer-brand">
          <BrandMark />
          <p>
            Ajudamos empresas a serem encontradas e recomendadas no Google e nas IAs.
          </p>
        </div>

        <nav className="footer-nav" aria-label="Links do rodapé">
          <a href="/#como-funciona">Como funciona</a>
          <a href="/#servicos">Serviços</a>
          <a href="/#faq">FAQ</a>
          <a href="/agencias">Para agências</a>
        </nav>
      </div>

      <div className="site-footer__bottom section-shell">
        <span>© {new Date().getFullYear()} {brand.name}</span>
        <a href="#top" className="back-to-top">Voltar ao topo ↑</a>
      </div>
    </footer>
  );
}
