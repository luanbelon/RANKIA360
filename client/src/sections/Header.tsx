import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/BrandMark";

const links = [
  ["AI Visibility Score", "/#score"],
  ["Como funciona", "/#como-funciona"],
  ["Serviços", "/#servicos"],
  ["FAQ", "/#faq"],
  ["Conteúdo", "/#conteudo"],
  ["Para agências", "/agencias"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <header className="site-header" id="top">
      <div className="site-header__inner">
        <BrandMark />
        
        <nav 
          id="main-navigation" 
          className={`main-nav ${open ? "main-nav--open" : ""}`} 
          aria-label="Navegação principal" 
          onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
        >
          {links.map(([label, href]) => (
            <a
              href={href}
              key={href}
              onClick={() => setOpen(false)}
              aria-current={href === location ? "page" : undefined}
            >
              {label}
            </a>
          ))}
          <a className="mobile-nav-cta" href="/#auditoria" onClick={() => setOpen(false)}>
            <span>Descobrir Score</span>
            <ArrowUpRight size={17} />
          </a>
        </nav>

        <div className="header-actions">
          <a className="button button--header" href="/#auditoria">
            <span>Descobrir Score</span>
            <ArrowUpRight size={16} />
          </a>
        </div>

        <button 
          className="menu-toggle" 
          aria-label={open ? "Fechar menu" : "Abrir menu"} 
          aria-controls="main-navigation" 
          aria-expanded={open} 
          onClick={() => setOpen(value => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
