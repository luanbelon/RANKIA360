import { ArrowRight, Braces, Compass, Search, ShieldCheck } from "lucide-react";

const pillars = [
  {
    code: "SEO",
    name: "Aparecer no Google",
    phrase: "Deixamos seu site rápido, organizado e sem erros para ser bem posicionado nas buscas.",
    icon: Search,
  },
  {
    code: "AEO",
    name: "Ser a resposta",
    phrase: "Criamos conteúdos que respondem de forma direta às perguntas que seus clientes fazem.",
    icon: Compass,
  },
  {
    code: "GEO",
    name: "Ser indicado pelas IAs",
    phrase: "Ajudamos o ChatGPT, o Gemini e outras IAs a entender quem você é e quando indicar a sua empresa.",
    icon: Braces,
  },
  {
    code: "Autoridade",
    name: "Ser referência no mercado",
    phrase: "Fortalecemos a reputação da sua marca com menções e informações confiáveis na internet.",
    icon: ShieldCheck,
  },
];

export function Services() {
  return (
    <section className="services-section section-shell" id="servicos">
      <div className="section-heading section-heading--center">
        <span className="eyebrow">
          <span className="eyebrow-mark" /> O QUE FAZEMOS
        </span>
        <h2>
          Quatro frentes. <span>Um objetivo: ser encontrado.</span>
        </h2>
        <p>
          Cada frente fortalece a outra. Montamos a combinação certa para o momento do seu site e os objetivos do seu negócio.
        </p>
      </div>

      <div className="service-pillars-grid">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <article className="service-pillar-card" key={item.code}>
              <div className="pillar-header">
                <span className="pillar-sigla">{item.code}</span>
                <span className="pillar-icon-box">
                  <Icon size={26} />
                </span>
              </div>
              <h3 className="pillar-full-name">{item.name}</h3>
              <p className="pillar-single-phrase">{item.phrase}</p>
            </article>
          );
        })}
      </div>

      <div className="section-bridge">
        <p>
          Não sabe por onde começar? <strong>A análise gratuita mostra o que a sua empresa precisa primeiro.</strong>
        </p>
        <a className="button button--primary" href="#auditoria">
          Analisar meu site <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
