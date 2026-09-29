import { ArrowRight, MessageSquareText, Search, Sparkles } from "lucide-react";

const googleResults = [
  { site: "guiadesaude.com.br", title: "Os 10 melhores dentistas em Curitiba" },
  { site: "sorrisopleno.com.br", title: "Clínica Sorriso Pleno | Dentista em Curitiba" },
  { site: "odontovida.com.br", title: "OdontoVida — Implantes e Ortodontia" },
  { site: "guiacuritiba.com", title: "Clínicas odontológicas no Batel" },
];

const recommended = ["Clínica Sorriso Pleno", "OdontoVida", "Instituto Dental Batel"];

const platforms = ["Google", "ChatGPT", "Gemini", "Perplexity", "AI Overviews"];

export function SearchShift() {
  return (
    <section className="shift-section section-shell" id="mudanca">
      <div className="section-heading section-heading--center">
        <span className="eyebrow">
          <span className="eyebrow-mark" /> A FORMA DE BUSCAR MUDOU
        </span>
        <h2>
          Seu cliente já pergunta à IA antes de escolher.<br /> <span>Sua empresa aparece na resposta?</span>
        </h2>
        <p className="shift-desc">
          O Google continua importante. Mas cada vez mais gente pede indicação direto à IA e recebe uma resposta pronta, com poucas empresas.
        </p>
      </div>

      <div className="shift-flow">
        <article className="flow-panel flow-panel--classic">
          <div className="flow-panel__head">
            <span className="flow-icon">
              <Search size={20} />
            </span>
            <div className="flow-head-info">
              <span className="flow-badge-sub">COMO ERA</span>
              <strong>O cliente pesquisa no Google</strong>
            </div>
            <span className="flow-panel__label">AINDA IMPORTA</span>
          </div>

          <div className="mock-search">
            <Search size={14} aria-hidden="true" />
            <span>dentista curitiba</span>
          </div>
          <ul className="mock-results">
            {googleResults.map((result) => (
              <li key={result.site}>
                <small>{result.site}</small>
                <span>{result.title}</span>
              </li>
            ))}
            <li className="mock-results__more">+ dezenas de outros resultados</li>
          </ul>

          <p className="flow-panel__takeaway">
            <strong>Dezenas de opções.</strong> O cliente abre várias abas, compara sozinho e decide depois.
          </p>
        </article>

        <div className="flow-transition" aria-hidden="true">
          <span className="flow-transition-circle">
            <ArrowRight size={20} />
          </span>
          <small>O QUE<br />MUDOU</small>
        </div>

        <article className="flow-panel flow-panel--answer">
          <div className="flow-panel__head">
            <span className="flow-icon flow-icon--lime">
              <MessageSquareText size={20} />
            </span>
            <div className="flow-head-info">
              <span className="flow-badge-sub flow-badge-sub--lime">COMO ESTÁ FICANDO</span>
              <strong>O cliente pergunta à IA</strong>
            </div>
            <span className="flow-panel__label flow-panel__label--lime">CRESCENDO</span>
          </div>

          <div className="mock-chat">
            <p className="mock-chat__question">Qual a melhor clínica odontológica em Curitiba?</p>
            <div className="mock-chat__answer">
              <span className="mock-chat__avatar" aria-hidden="true">
                <Sparkles size={14} />
              </span>
              <div>
                <p>Recomendo estas 3 opções bem avaliadas:</p>
                <ol>
                  {recommended.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <p className="flow-panel__takeaway">
            <strong>Só 3 empresas indicadas.</strong> Se a sua não está entre elas, o cliente nem chega a conhecê-la.
          </p>
        </article>
      </div>

      <div className="shift-platforms">
        <span>Isso já acontece no</span>
        <ul>
          {platforms.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="section-bridge">
        <p>
          Quer saber se a sua empresa aparece nessas respostas? <strong>É isso que o AI Visibility Score mede.</strong>
        </p>
        <a className="text-link" href="#score">
          Entender o Score <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
