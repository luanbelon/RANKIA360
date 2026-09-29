import type { CSSProperties } from "react";
import { BarChart3, FileCheck2, Handshake, Palette, Search, TrendingUp, UserCheck, Users } from "lucide-react";
import { brand } from "@shared/brand";
import { agencyFaqItems } from "@shared/faq";
import { Header } from "@/sections/Header";
import { Agency } from "@/sections/Agency";
import { FAQ } from "@/sections/FAQ";
import { FinalCTA, Footer } from "@/sections/Footer";

const benefits = [
  {
    code: "Receita",
    name: "Nova receita recorrente",
    phrase: "Venda um serviço que seus clientes já estão pedindo e que poucas agências sabem entregar.",
    icon: TrendingUp,
  },
  {
    code: "Equipe",
    name: "Sem contratar especialistas",
    phrase: "Nossa equipe executa a parte técnica. A sua foca em vender e atender.",
    icon: Users,
  },
  {
    code: "Marca",
    name: "100% com a sua marca",
    phrase: "Relatórios, apresentações e entregas saem com a identidade visual da sua agência.",
    icon: Palette,
  },
  {
    code: "Cliente",
    name: "O cliente continua seu",
    phrase: "Você mantém o relacionamento, o contrato e o faturamento. Nós ficamos nos bastidores.",
    icon: Handshake,
  },
];

const steps = [
  {
    step: "01",
    title: "Você traz o cliente",
    desc: "Apresenta o AI Visibility Score como parte do seu portfólio.",
    icon: UserCheck,
  },
  {
    step: "02",
    title: "Diagnóstico",
    desc: "Analisamos o site do cliente e entregamos o AI Visibility Score com a sua marca.",
    icon: Search,
  },
  {
    step: "03",
    title: "Estratégia e execução",
    desc: "Planejamos e executamos as melhorias de SEO, AEO e GEO nos bastidores.",
    icon: FileCheck2,
  },
  {
    step: "04",
    title: "Você apresenta os resultados",
    desc: "Recebe relatórios prontos para mostrar a evolução ao cliente.",
    icon: BarChart3,
  },
];

export default function Agencias() {
  return (
    <div className="app-shell" style={{ "--brand-accent": brand.accent } as CSSProperties}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header />
      <main id="main-content">
        <Agency />

        <section className="services-section section-shell" id="beneficios">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">
              <span className="eyebrow-mark" /> POR QUE SER PARCEIRO
            </span>
            <h2>
              Seus clientes vão pedir AI Visibility Score. <span>Esteja pronto para entregar.</span>
            </h2>
            <p>
              Empresas já perguntam como aparecer no ChatGPT e no Gemini. Com a parceria, sua agência passa a oferecer isso sem montar uma equipe nova.
            </p>
          </div>

          <div className="service-pillars-grid">
            {benefits.map((item) => {
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
        </section>

        <section className="method-section section-shell" id="como-funciona-parceria">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">
              <span className="eyebrow-mark" /> COMO FUNCIONA A PARCERIA
            </span>
            <h2>
              Você na frente. <span>Nós nos bastidores.</span>
            </h2>
            <p>
              Um processo simples para sua agência vender, entregar e mostrar resultado sem aumentar a equipe.
            </p>
          </div>

          <ol className="journey journey--4">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === steps.length - 1;
              return (
                <li
                  className={`journey__item${isLast ? " journey__item--final" : ""}`}
                  key={item.step}
                  style={{ "--step": index } as CSSProperties}
                >
                  <div className="journey__marker" aria-hidden="true">
                    <span className="journey__dot">{item.step}</span>
                  </div>
                  <div className="journey__card">
                    <div className="journey__card-top">
                      <span className="journey__icon">
                        <Icon size={20} />
                      </span>
                      <span className="journey__label">
                        {isLast ? "Resultado" : `Etapa ${item.step}`}
                      </span>
                    </div>
                    <h3 className="journey__title">{item.title}</h3>
                    <p className="journey__desc">{item.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <FAQ
          items={agencyFaqItems}
          title={
            <>
              Dúvidas sobre<br />
              <span>a parceria.</span>
            </>
          }
          description="O que você precisa saber antes de oferecer o AI Visibility Score aos seus clientes."
          ctaHref="#auditoria-agencia"
          ctaLabel="Comece analisando o site de um cliente"
        />

        <FinalCTA
          badge="COMECE AGORA"
          title={
            <>
              Comece pelo site de <span>um cliente.</span>
            </>
          }
          subtitle="Rode a análise gratuita, libere o relatório e marque que quer falar com um especialista para conhecer a parceria."
          idPrefix="agencia"
        />
      </main>

      <Footer />
    </div>
  );
}
