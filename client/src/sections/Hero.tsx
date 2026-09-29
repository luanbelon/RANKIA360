import { useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import type { AuditCategory, SiteAuditResult } from "@shared/audit-types";
import { DomainAnalyzer } from "@/components/DomainAnalyzer";
import { AuditDetails } from "@/components/AuditResults";
import { VisibilityDashboard, type DashboardCategory } from "@/components/VisibilityDashboard";

const categoryNotes: Record<AuditCategory["key"], string> = {
  technical: "Acesso e leitura do site",
  content: "Clareza e respostas",
  entity: "Dados que provam quem é você",
  structuredData: "Dados para as máquinas",
  aiPresence: "Se as IAs indicam você",
};

const demoCategories: DashboardCategory[] = [
  { key: "technical", label: "Saúde técnica", score: 81, note: categoryNotes.technical },
  { key: "content", label: "Conteúdo", score: 48, note: categoryNotes.content },
  { key: "entity", label: "Marca", score: 37, note: categoryNotes.entity },
  { key: "structuredData", label: "Informações para robôs", score: 72, note: categoryNotes.structuredData },
  { key: "aiPresence", label: "Presença nas IAs", score: 42, note: categoryNotes.aiPresence },
];

const REPORT_ID = "relatorio";

function resultSummary(result: SiteAuditResult) {
  const answered = result.aiPresence?.engines.filter(item => item.status === "ok") ?? [];
  if (answered.length && result.aiPresence?.recommendationQuestion) {
    return answered.some(item => item.recommended)
      ? <>Sua empresa foi <strong>indicada pela IA</strong> quando perguntamos por {result.aiPresence.profile.category}.</>
      : <>Perguntamos às IAs por {result.aiPresence.profile.category} e sua empresa <strong>não foi indicada</strong>.</>;
  }
  const sorted = result.categories.filter(item => item.measured).sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (!best || !worst || best.key === worst.key) return <>Análise concluída para <strong>{result.domain}</strong>.</>;
  return (
    <>
      Ponto mais forte: <strong>{best.label}</strong>. Maior oportunidade: <strong>{worst.label}</strong>.
    </>
  );
}

export function Hero() {
  const [result, setResult] = useState<SiteAuditResult | null>(null);

  function showResult(next: SiteAuditResult) {
    setResult(next);
    window.setTimeout(() => {
      document.getElementById("hero-visual")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function openReport() {
    document.getElementById(REPORT_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero__grid-glow" aria-hidden="true" />

        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow">
            <span className="eyebrow-mark" />
            <span>GOOGLE</span>
            <i>•</i>
            <span>CHATGPT</span>
            <i>•</i>
            <span>GEMINI</span>
            <i>•</i>
            <span>PERPLEXITY</span>
          </div>

          <h1 id="hero-title">
            Sua empresa <span className="hero-highlight">aparece</span> quando alguém pergunta à <span className="hero-highlight hero-highlight--outlined">IA?</span>
          </h1>

          <p className="hero-subtitle">
            Seus clientes já pedem indicações ao ChatGPT, ao Gemini e ao Google. Descubra em menos de 1 minuto se a sua empresa é entendida e recomendada por eles.
          </p>

          <DomainAnalyzer idPrefix="hero" onResult={showResult} />

          <div className="hero-proof">
            <span><ShieldCheck size={16} /> Usamos apenas informações públicas do site</span>
            <span><Check size={16} /> Não pedimos senhas nem acessos</span>
          </div>
        </div>

        <div
          className="hero-visual"
          id="hero-visual"
          role="region"
          aria-live="polite"
          aria-label={result ? `Resultado da análise de ${result.domain}` : "Painel de demonstração do AI Visibility Score"}
        >
          <div className="visual-orbit visual-orbit--one" />
          <div className="visual-orbit visual-orbit--two" />

          {result ? (
            <VisibilityDashboard
              key={result.id}
              variant="result"
              domain={result.domain}
              score={result.score}
              opportunities={result.findings.filter(item => item.priority !== "good").length}
              summary={resultSummary(result)}
              meta={`Analisado em ${new Date(result.analyzedAt).toLocaleDateString("pt-BR")}`}
              categories={result.categories.map(item => ({ key: item.key, label: item.label, score: item.measured ? item.score : null, note: item.measured ? categoryNotes[item.key] : "Não consultado agora" }))}
              foot={
                <>
                  <span className="dashboard-foot__lock">
                    <ShieldCheck size={14} /> Baseado em dados públicos
                  </span>
                  <button type="button" className="dashboard-foot__cta" onClick={openReport}>
                    Ver o que corrigir <ArrowDown size={14} />
                  </button>
                </>
              }
            />
          ) : (
            <>
              <VisibilityDashboard
                domain="exemplo.com.br"
                score={56}
                opportunities={17}
                summary={<>Site tecnicamente saudável, mas a marca ainda é pouco <strong>reconhecida</strong> e pouco <strong>citada pelas IAs</strong>.</>}
                meta="Dados públicos"
                categories={demoCategories}
                foot={
                  <>
                    <span className="dashboard-foot__lock">
                      <ShieldCheck size={14} /> Exemplo ilustrativo
                    </span>
                    <span className="dashboard-foot__cta">
                      <Sparkles size={14} /> Teste com o seu site acima
                    </span>
                  </>
                }
              />

              <div className="floating-tag floating-tag--top">
                <span className="floating-tag__spark">✳</span>
                <div className="floating-tag__text">
                  <span>Google</span>
                  <strong>Sua empresa bem posicionada</strong>
                </div>
              </div>

              <div className="floating-tag floating-tag--bottom">
                <span className="floating-tag__orb" />
                <div className="floating-tag__text">
                  <span>ChatGPT e Gemini</span>
                  <strong>Sua marca indicada nas respostas</strong>
                </div>
                <ArrowUpRight size={16} />
              </div>
            </>
          )}
        </div>

        {!result && (
          <a href="#mudanca" className="hero-scroll" aria-label="Entenda como a busca está mudando">
            <span>DESCUBRA COMO A BUSCA MUDOU</span>
            <ArrowDownRight size={16} />
          </a>
        )}
      </section>

      {result && (
        <section className="hero-report section-shell" id={REPORT_ID} aria-labelledby="hero-report-title">
          <div className="hero-report__inner">
            <div className="hero-report__heading">
              <span className="eyebrow"><span className="status-pulse" /> ANÁLISE CONCLUÍDA · {result.domain}</span>
              <h2 id="hero-report-title">O que melhorar para a sua empresa <span>aparecer mais</span></h2>
            </div>
            <AuditDetails key={result.id} result={result} />
          </div>
        </section>
      )}
    </>
  );
}
