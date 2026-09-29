import { ArrowRight, ArrowUpRight, BookOpen, Clock3 } from "lucide-react";

const articles = [
  {
    category: "IA NA BUSCA",
    title: "Como o ChatGPT e o Gemini escolhem quais empresas indicar",
    summary: "Os critérios que fazem uma marca aparecer, ou ficar de fora, das respostas das IAs.",
    readTime: "6 min de leitura",
    number: "01",
  },
  {
    category: "GEO & AEO",
    title: "O que é GEO e como preparar o seu site para as IAs",
    summary: "Um guia prático para organizar as informações do seu site e facilitar que as IAs indiquem a sua empresa.",
    readTime: "8 min de leitura",
    number: "02",
  },
  {
    category: "ESTRATÉGIA",
    title: "Google ou IA: onde a sua empresa deve investir?",
    summary: "Por que o Google continua importante e como aproveitar também a busca por inteligência artificial.",
    readTime: "5 min de leitura",
    number: "03",
  },
];

export function Insights() {
  return (
    <section className="insights-section section-shell" id="conteudo">
      <div className="section-heading section-heading--center">
        <span className="eyebrow">
          <span className="eyebrow-mark" /> CONTEÚDO
        </span>
        <h2>
          Entenda a nova busca <span>sem complicação.</span>
        </h2>
        <p>
          Guias práticos para preparar a sua empresa para a nova forma como os clientes procuram e escolhem.
        </p>
      </div>

      {/* Exactly 3 Articles on the Home */}
      <div className="insight-grid">
        {articles.map((item) => (
          <article className="insight-card" key={item.number}>
            <div className="insight-card__top">
              <span className="insight-category-badge">{item.category}</span>
              <span className="insight-number">{item.number} / 03</span>
            </div>

            <div className="insight-card__body">
              <h3 className="insight-card__title">{item.title}</h3>
              <p className="insight-card__summary">{item.summary}</p>
            </div>

            <div className="insight-card__foot">
              <span className="insight-read-time">
                <Clock3 size={15} />
                <span>{item.readTime}</span>
              </span>
              <span className="insight-card__arrow">
                <ArrowUpRight size={18} />
              </span>
            </div>

            <span className="insight-card__stripe" />
          </article>
        ))}
      </div>

      {/* Required CTA */}
      <div className="insights-cta-wrap">
        <a className="button button--outline insights-all-cta" href="#conteudo">
          <span>Ver todos os conteúdos</span>
          <ArrowRight size={17} />
        </a>
      </div>
    </section>
  );
}
