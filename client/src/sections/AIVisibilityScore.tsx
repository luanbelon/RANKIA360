import { ArrowRight, Braces, Code2, Network, Sparkles, BookOpenCheck, CheckCircle2 } from "lucide-react";

const pillars = [
  {
    id: "01",
    title: "Saúde técnica do site",
    tag: "BASE TÉCNICA",
    icon: Code2,
    desc: "Verificamos se o Google e as IAs conseguem acessar e ler o seu site, inclusive sem executar JavaScript.",
    signals: ["Site seguro e liberado para buscadores", "Sitemap e robots.txt publicados", "Conteúdo visível para os robôs das IAs"],
  },
  {
    id: "02",
    title: "Qualidade do conteúdo",
    tag: "CONTEÚDO",
    icon: BookOpenCheck,
    desc: "Avaliamos se a página explica com clareza o que você faz e responde às dúvidas dos seus clientes.",
    signals: ["Título e descrição claros", "Texto suficiente e bem dividido", "Respostas a perguntas frequentes"],
  },
  {
    id: "03",
    title: "Reconhecimento da marca",
    tag: "MARCA",
    icon: Network,
    desc: "Conferimos se o site mostra os dados que provam que a sua empresa é real: quem é, como falar com ela e onde está.",
    signals: ["Páginas Sobre e Contato", "Telefone, e-mail e endereço visíveis", "Perfis sociais oficiais vinculados"],
  },
  {
    id: "04",
    title: "Informações para robôs",
    tag: "DADOS ESTRUTURADOS",
    icon: Braces,
    desc: "Checamos se o site descreve a empresa, os contatos e os serviços num formato que as máquinas entendem sem confusão.",
    signals: ["Empresa descrita em schema.org", "Contatos e perfis informados", "Serviços e perguntas marcados"],
  },
  {
    id: "05",
    title: "Presença nas IAs",
    tag: "CONSULTA REAL",
    icon: Sparkles,
    desc: "Perguntamos às IAs, como um cliente faria, se elas conhecem e indicam a sua empresa.",
    signals: ["Se as IAs reconhecem a sua marca", "Se indicam você quando o cliente pede", "Quais concorrentes aparecem no seu lugar"],
  },
];

export function AIVisibilityScoreSection() {
  return (
    <section className="score-section section-shell" id="score">
      {/* 03: AI VISIBILITY SCORE PROTAGONIST */}
      <div className="score-intro">
        <div className="section-heading score-intro__heading">
          <span className="eyebrow">
            <span className="eyebrow-mark" /> NOSSO DIAGNÓSTICO
          </span>
          <h2>
            O que é o <span>AI Visibility Score?</span>
          </h2>
          <p className="score-desc">
            Uma nota de 0 a 100 que mostra o quanto o Google e as IAs entendem, confiam e recomendam a sua empresa.
          </p>
        </div>

        <div className="score-overview-card">
          <span className="overview-icon">
            <Sparkles size={24} />
          </span>
          <h3>Por que o Score é diferente?</h3>
          <p>
            Ferramentas comuns mostram em que posição você aparece no Google. O <strong>AI Visibility Score</strong> vai além: mostra se as IAs entendem a sua empresa bem o suficiente para indicá-la.
          </p>
        </div>

        <div className="score-overview-card">
          <span className="overview-icon">
            <CheckCircle2 size={24} />
          </span>
          <h3>O que você descobre</h3>
          <p>
            O que está impedindo a sua empresa de aparecer nas respostas do ChatGPT, do Gemini e do Google, e por onde começar a corrigir.
          </p>
        </div>
      </div>

      {/* 04: O QUE ANALISAMOS */}
      <div className="pillars-wrap">
        <div className="section-heading pillars-heading">
          <span className="eyebrow">5 PONTOS ANALISADOS</span>
          <h2>
            O que analisamos no <span>seu site</span>
          </h2>
          <p>
            Olhamos os 5 pontos que decidem se o Google e as IAs entendem e recomendam a sua empresa:
          </p>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article className="pillar-card" key={pillar.id}>
                <div className="pillar-card__top">
                  <span className="pillar-index">{pillar.id}</span>
                  <span className="pillar-icon">
                    <Icon size={22} />
                  </span>
                </div>
                <span className="pillar-tag">{pillar.tag}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.desc}</p>
                
                <div className="pillar-signals">
                  {pillar.signals.map((sig) => (
                    <span className="pillar-signal-item" key={sig}>
                      <span className="signal-dot" />
                      <span>{sig}</span>
                    </span>
                  ))}
                </div>
              </article>
            );
          })}

          {/* 06: Quadrado de CTA Integrado */}
          <article className="pillar-card pillar-card--cta">
            <div className="pillar-card__top pillar-card__top--cta">
              <span className="pillar-icon pillar-icon--cta">
                <Sparkles size={20} />
              </span>
            </div>
            <span className="pillar-tag pillar-tag--cta">ANÁLISE GRATUITA</span>
            <h3>Quer saber onde sua empresa está posicionada hoje?</h3>
            <p>Gere seu relatório em menos de 1 minuto sem custo. Descubra os pontos cegos da sua marca na busca com IA.</p>
            
            <div className="pillar-cta-box">
              <a className="button button--primary pillar-cta-button" href="#auditoria">
                <span>Analisar meu AI Visibility Score</span>
                <ArrowRight size={16} />
              </a>
              <span className="pillar-cta-guarantee">
                Grátis • Sem necessidade de cartão
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
