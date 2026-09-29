import { ArrowRight, BriefcaseBusiness, Building2, GraduationCap, HeartPulse, House, Landmark, Layers3, Lightbulb } from "lucide-react";

const sectors = [
  ["Clínicas e saúde", HeartPulse], ["Imobiliárias", House], ["Escritórios", Landmark], ["SaaS", Layers3],
  ["Empresas B2B", Building2], ["Consultorias", BriefcaseBusiness], ["Educação", GraduationCap], ["Serviços especializados", Lightbulb],
] as const;

export function Industries() {
  return (
    <section className="industries-section section-shell" id="segmentos">
      <div className="industries-copy"><span className="eyebrow">FEITO PARA NEGÓCIOS ONDE VISIBILIDADE GERA RECEITA</span><h2>Se a escolha começa<br/>na busca, <span>é para você.</span></h2><p>Para empresas que dependem de serem encontradas, compreendidas e consideradas — em uma jornada de descoberta que está mudando.</p><a href="#auditoria" className="text-link">Descubra suas oportunidades <ArrowRight size={15}/></a></div>
      <div className="sector-grid">{sectors.map(([label, Icon]) => <div className="sector-chip" key={label}><Icon size={17}/><span>{label}</span><span className="sector-arrow">↗</span></div>)}<div className="sector-chip sector-chip--more"><span className="sector-plus">+</span><span>E outros segmentos</span></div></div>
    </section>
  );
}
