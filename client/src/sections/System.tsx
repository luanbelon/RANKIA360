import { ArrowDownRight, ArrowRight, Atom, BadgeCheck, Braces, Building2, Search, Sparkles } from "lucide-react";

const systemSteps = [
  { number: "01", label: "FUNDAÇÃO", title: "SEO", text: "Saúde técnica, velocidade, arquitetura e indexabilidade.", icon: Search },
  { number: "02", label: "COMPREENSÃO", title: "Entidades + estrutura", text: "Dados estruturados e contexto que identificam sua marca.", icon: Braces },
  { number: "03", label: "AUTORIDADE", title: "Conteúdo + reputação", text: "Informação útil, autoria verificável e profundidade temática.", icon: BadgeCheck },
  { number: "04", label: "DESCOBERTA", title: "Busca + respostas", text: "Sinais mais claros para um ecossistema de descoberta em evolução.", icon: Sparkles },
];

export function System() {
  return (
    <section className="system-section section-shell" id="sistema">
      <div className="section-heading section-heading--center"><span className="eyebrow">UM SISTEMA. VÁRIOS PONTOS DE DESCOBERTA.</span><h2>Visibilidade <span>além do Google.</span></h2><p>Combinamos sinais técnicos, editoriais e de autoridade para ajudar mecanismos de busca e sistemas de IA a compreender sua marca.</p></div>
      <div className="system-diagram">
        {systemSteps.map((step, index) => { const Icon = step.icon; return <article className="system-step" key={step.number}><span className="system-step__index">{step.number}</span><span className="system-step__icon"><Icon size={19} strokeWidth={1.7} /></span><span className="system-step__label">{step.label}</span><h3>{step.title}</h3><p>{step.text}</p>{index < systemSteps.length - 1 && <span className="system-step__connector"><ArrowRight size={15} /></span>}</article>; })}
      </div>
      <div className="ecosystem-bar"><div className="ecosystem-bar__copy"><span className="ecosystem-pulse"><Atom size={17}/></span><div><strong>Um novo ecossistema de descoberta</strong><span>Presença clara. Sinais coerentes. Melhor compreensão.</span></div></div><div className="ecosystem-platforms"><span>Google</span><span>ChatGPT</span><span>Gemini</span><span>Perplexity</span><span>AI Overviews</span></div><small>Plataformas citadas como contexto; não há integração oficial nem garantia de recomendação.</small></div>
      <a href="#metodologia" className="text-link">Conheça nossa metodologia <ArrowDownRight size={16}/></a>
    </section>
  );
}
