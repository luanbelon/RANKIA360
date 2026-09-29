import type { CSSProperties } from "react";
import { brand } from "@shared/brand";
import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { SearchShift } from "@/sections/SearchShift";
import { AIVisibilityScoreSection } from "@/sections/AIVisibilityScore";
import { Methodology } from "@/sections/Methodology";
import { Services } from "@/sections/Services";
import { Insights } from "@/sections/Insights";
import { FAQ } from "@/sections/FAQ";
import { FinalCTA, Footer } from "@/sections/Footer";
import { useScrollToHash } from "@/hooks/useScrollToHash";

export default function Home() {
  useScrollToHash();

  return (
    <div className="app-shell" style={{ "--brand-accent": brand.accent } as CSSProperties}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header />
      <main id="main-content">
        {/* 01: HERO + ANALISADOR */}
        <Hero />
        
        {/* 02: PROBLEMA — A BUSCA MUDOU (GOOGLE VS IA) */}
        <SearchShift />

        {/* 03: SOLUÇÃO — AI VISIBILITY SCORE & O QUE ANALISAMOS */}
        <AIVisibilityScoreSection />
        
        {/* 04: COMO FUNCIONA */}
        <Methodology />
        
        {/* 05: OFERTA — SERVIÇOS */}
        <Services />
        
        {/* 06: OBJEÇÕES — FAQ */}
        <FAQ />

        {/* 07: CONTEÚDO (3 ARTIGOS) */}
        <Insights />
        
        {/* 08: CTA FINAL */}
        <FinalCTA />
      </main>
      
      <Footer />
    </div>
  );
}
