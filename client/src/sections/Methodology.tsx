import type { CSSProperties } from "react";
import { CheckCircle, FileText, Globe2, ScanEye, Sparkles } from "lucide-react";

const flowSteps = [
  {
    step: "01",
    title: "Domínio",
    desc: "Você informa o site da sua empresa no analisador.",
    icon: Globe2,
  },
  {
    step: "02",
    title: "Análise",
    desc: "Lemos as informações públicas do site, como o Google e as IAs fazem.",
    icon: ScanEye,
  },
  {
    step: "03",
    title: "Score",
    desc: "Calculamos a sua nota de 0 a 100 no AI Visibility Score.",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "Oportunidades",
    desc: "Mostramos o que está atrapalhando e o que corrigir primeiro.",
    icon: CheckCircle,
  },
  {
    step: "05",
    title: "Relatório",
    desc: "Você recebe um relatório claro, pronto para colocar em prática.",
    icon: FileText,
  },
];

export function Methodology() {
  return (
    <section className="method-section section-shell" id="como-funciona">
      <div className="section-heading section-heading--center">
        <span className="eyebrow">
          <span className="eyebrow-mark" /> SIMPLES, EM 5 ETAPAS
        </span>
        <h2>
          Como funciona a <span>sua análise</span>
        </h2>
        <p>
          Do endereço do seu site a um plano de ação claro, em menos de 1 minuto.
        </p>
      </div>

      {/* 5-Step Visual Flow - Comprehended in 3 seconds */}
      <ol className="journey">
        {flowSteps.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === flowSteps.length - 1;
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
  );
}
