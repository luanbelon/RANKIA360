import { ArrowRight, Check, Layers3, Settings2, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const benefits = [
  "Entrega 100% white label com a marca da sua agência",
  "Relatórios executivos e diagnósticos prontos para apresentação",
  "Execução técnica, estruturação de dados e estratégias de AEO/GEO",
  "Sua agência mantém todo o relacionamento e faturamento do cliente",
];

export function Agency() {
  return (
    <section className="agency-section section-shell" id="agencias">
      <div className="agency-card">
        <div className="agency-card__grid" aria-hidden="true" />
        
        <div className="agency-content">
          <span className="agency-badge">
            <Sparkles size={15} /> PARCERIA PARA AGÊNCIAS
          </span>
          
          <h1>
            AI Visibility Score sem<br />
            aumentar <span>sua equipe.</span>
          </h1>
          
          <p className="agency-subtitle">
            Ofereça SEO, AEO e GEO aos seus clientes com a marca da sua agência. Nós cuidamos da estratégia e da execução nos bastidores.
          </p>

          <div className="agency-benefits-list">
            {benefits.map((item) => (
              <div className="agency-benefit-item" key={item}>
                <span className="benefit-check-box">
                  <Check size={16} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="agency-actions">
            <a 
              className="button button--lime agency-cta" 
              href="#auditoria-agencia" 
              onClick={() => trackEvent("agency_cta_clicked")}
            >
              <span>Conhecer parceria white label</span>
              <ArrowRight size={18} />
            </a>
            <span className="agency-micro-note">
              Comece pelo diagnóstico do seu cliente e sinalize o interesse em parceria.
            </span>
          </div>
        </div>

        <div className="agency-visual" role="group" aria-label="Estrutura de operação white label">
          <div className="agency-visual__head">
            <span>ARQUITETURA DE ATENDIMENTO</span>
            <span className="agency-online">
              <i /> MODELO WHITE LABEL
            </span>
          </div>

          <div className="agency-visual__stack">
            <div className="agency-stack-card agency-stack-card--front">
              <span className="agency-stack-icon">
                <Layers3 size={20} />
              </span>
              <div className="stack-card-text">
                <small>CAMADA 01 • LINHA DE FRENTE</small>
                <strong>Sua Agência</strong>
                <p>Relacionamento, gestão de conta e apresentação estratégica.</p>
              </div>
            </div>

            <div className="agency-stack-card agency-stack-card--middle">
              <span className="agency-stack-icon">
                <Sparkles size={20} />
              </span>
              <div className="stack-card-text">
                <small>CAMADA 02 • INTELIGÊNCIA</small>
                <strong>Estratégia AI Visibility Score</strong>
                <p>Planejamento de entidades, dados estruturados e autoridade.</p>
              </div>
            </div>

            <div className="agency-stack-card agency-stack-card--back">
              <span className="agency-stack-icon">
                <Settings2 size={20} />
              </span>
              <div className="stack-card-text">
                <small>CAMADA 03 • BASTIDORES</small>
                <strong>Execução Especializada</strong>
                <p>Implementação técnica e relatórios com a sua identidade.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
