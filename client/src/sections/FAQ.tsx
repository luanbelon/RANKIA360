import type { ReactNode } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { homeFaqItems, type FaqItem } from "@shared/faq";

type FAQProps = {
  items?: FaqItem[];
  title?: ReactNode;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function FAQ({
  items = homeFaqItems,
  title = (
    <>
      Perguntas diretas.<br />
      <span>Sem promessas vazias.</span>
    </>
  ),
  description = "Respostas claras sobre como funciona, o que analisamos e o que dá para esperar.",
  ctaHref = "#auditoria",
  ctaLabel = "Ainda tem dúvidas? Faça sua análise gratuita",
}: FAQProps) {
  return (
    <section className="faq-section section-shell" id="faq">
      <div className="faq-intro">
        <span className="eyebrow">
          <HelpCircle size={15} /> PERGUNTAS FREQUENTES
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        <a href={ctaHref} className="text-link">
          <span>{ctaLabel}</span>
          <span>→</span>
        </a>
      </div>

      <div className="faq-list">
        {items.map((item, index) => (
          <details className="faq-item" key={item.q}>
            <summary>
              <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="faq-question-text">{item.q}</span>
              <ChevronDown size={20} className="faq-chevron" />
            </summary>
            <div className="faq-answer">
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
