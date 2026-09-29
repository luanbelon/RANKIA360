import { useCallback, useState } from "react";
import { ArrowUpRight, Check, CircleAlert, LockKeyhole, MessageSquareQuote, Sparkles, X } from "lucide-react";
import type { AiPresenceResult, SiteAuditResult } from "@shared/audit-types";
import { ScoreRing } from "@/components/ScoreRing";
import { LeadCapture } from "@/components/LeadCapture";
import { trackEvent } from "@/lib/analytics";

const statusFor = (score: number) => score >= 75 ? "Sinais consistentes" : score >= 50 ? "Há espaço para evoluir" : "Base a fortalecer";

export function AuditResults({ result, id, fullAccess = false }: { result: SiteAuditResult; id: string; fullAccess?: boolean }) {
  return (
    <section className="audit-result" id={id} aria-labelledby={`${id}-title`}>
      <div className="audit-result__heading">
        <div><span className="eyebrow"><span className="status-pulse" /> ANÁLISE CONCLUÍDA · {result.domain}</span><h2 id={`${id}-title`}>Seu retrato de <span>visibilidade</span></h2></div>      </div>
      <div className="result-dashboard">
        <article className="score-panel">
          <div className="score-panel__eyebrow">AI VISIBILITY SCORE <span className="live-indicator"><i /> SINAIS PÚBLICOS</span></div>
          <div className="score-panel__body">
            <ScoreRing score={result.score} />
            <div className="score-panel__context"><strong>{statusFor(result.score)}.</strong><p>Nota calculada a partir da página inicial do site e das respostas das IAs.</p><span><Check size={14} /> {result.metrics.wordCount.toLocaleString("pt-BR")} palavras lidas</span><span><Check size={14} /> {result.metrics.structuredDataTypes.length} tipos de dados estruturados</span></div>
          </div>
          <div className="score-categories" role="group" aria-label="Pontuação por categoria">
            {result.categories.map((item, index) => <div className="score-category" key={item.key}>
              <div className="score-category__top"><span>{item.label}</span><span>{item.measured ? <>{item.score}<small>/100</small></> : <small>Não medido</small>}</span></div>
              <div className="score-bar" role="meter" aria-label={item.measured ? `${item.label}: ${item.score} de 100` : `${item.label}: não medido`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.measured ? item.score : 0}><i style={{ width: `${item.measured ? item.score : 0}%`, transitionDelay: `${index * 70}ms` }} /></div>
              <p>{item.explanation}</p>
            </div>)}
          </div>
        </article>
        <div className="audit-aside" role="group" aria-labelledby={`${id}-domain-summary`}>
          <div className="audit-aside__top"><span className="eyebrow">RESUMO DO DOMÍNIO</span><span className="signal-icon"><Sparkles size={16} /></span></div>
          <h3 id={`${id}-domain-summary`}>{result.pageTitle}</h3>
          <p className="audit-aside__description">{result.metaDescription}</p>
          <div className="audit-metrics">
            <div><span>H1 na página</span><strong>{result.metrics.h1Count}</strong></div>
            <div><span>Links internos</span><strong>{result.metrics.internalLinks}</strong></div>
            <div><span>Imagens sem alt</span><strong>{result.metrics.imagesWithoutAlt}</strong></div>
            <div><span>HTTPS</span><strong className={result.signals.https ? "metric-good" : "metric-bad"}>{result.signals.https ? "Ativo" : "Ausente"}</strong></div>
          </div>
          <div className="audit-aside__note"><CircleAlert size={15} /><span>Analisamos a página inicial e informações públicas. Não acessamos o Google Search Console nem dados privados do site.</span></div>
        </div>
      </div>
      <AuditDetails result={result} fullAccess={fullAccess} />
    </section>
  );
}

export function AuditDetails({ result, fullAccess = false }: { result: SiteAuditResult; fullAccess?: boolean }) {
  const [leadOpen, setLeadOpen] = useState(false);
  const [unlockedByLead, setReportUnlocked] = useState(false);
  const reportUnlocked = fullAccess || unlockedByLead;
  const [deliveryNote, setDeliveryNote] = useState("");
  const [leadReceived, setLeadReceived] = useState(false);
  const closeLead = useCallback(() => setLeadOpen(false), []);
  const visibleFindings = reportUnlocked ? result.findings : result.findings.slice(0, 3);
  const hiddenCount = Math.max(0, result.findings.length - visibleFindings.length);

  return (
    <>
      {result.aiPresence && <AiAnswers ai={result.aiPresence} />}
      <div className="findings-heading"><div><span className="eyebrow">O QUE ENCONTRAMOS</span><h3>{result.findings.length} {result.findings.length === 1 ? "ponto" : "pontos"} para revisar</h3></div><span className="findings-count">{result.findings.filter(item => item.priority === "high").length} prioridade alta</span></div>
      <div className="findings-list">
        {visibleFindings.map((finding, index) => <article className={`finding-row ${finding.priority === "good" ? "finding-row--good" : ""}`} key={finding.id}>
          <span className={`finding-index ${finding.priority === "high" ? "finding-index--high" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
          <div className="finding-main"><div className="finding-meta"><span className={`priority-label priority-label--${finding.priority}`}>{finding.priority === "high" ? "PRIORIDADE ALTA" : finding.priority === "good" ? "SINAL POSITIVO" : "OPORTUNIDADE"}</span><span>{finding.category}</span></div><h4>{finding.title}</h4><p>{finding.description}</p></div>
          <ArrowUpRight size={17} className="finding-arrow" aria-hidden="true" />
        </article>)}
      </div>
      {hiddenCount > 0 && !reportUnlocked && <div className="report-gate"><span className="report-gate__lock"><LockKeyhole size={17} /></span><div><strong>Mais {hiddenCount} {hiddenCount === 1 ? "ponto encontrado" : "pontos encontrados"}</strong><span>Informe seus dados para liberar o relatório completo com todas as recomendações.</span></div><button className="button button--outline" onClick={() => { setLeadOpen(true); trackEvent("lead_form_opened"); }}>Receber relatório completo <ArrowUpRight size={15} /></button></div>}
      {unlockedByLead && <div className={`delivery-note ${leadReceived ? "delivery-note--success" : ""}`} role="status"><Check size={16} /><span>{deliveryNote}</span></div>}
      <details className="audit-limitations"><summary>Como interpretar este score</summary><ul>{result.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      {!fullAccess && <LeadCapture open={leadOpen} result={result} onClose={closeLead} onComplete={response => { setReportUnlocked(response.reportUnlocked); setDeliveryNote(response.message); setLeadReceived(response.received); setLeadOpen(false); }} />}
    </>
  );
}

function AnswerFlag({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`ai-flag ${ok ? "ai-flag--yes" : "ai-flag--no"}`}>{ok ? <Check size={13} /> : <X size={13} />}{label}</span>;
}

function AiAnswers({ ai }: { ai: AiPresenceResult }) {
  const consulted = ai.engines.filter(item => item.status !== "not_configured");
  if (!consulted.length) return null;
  return (
    <div className="ai-answers">
      <div className="findings-heading">
        <div><span className="eyebrow">O QUE AS IAS RESPONDERAM</span><h3>Perguntamos às IAs sobre a sua empresa</h3></div>
      </div>
      <div className="ai-answers__questions">
        {ai.recommendationQuestion && <p><MessageSquareQuote size={15} /> <span>Pergunta de cliente:</span> “{ai.recommendationQuestion}”</p>}
        <p><MessageSquareQuote size={15} /> <span>Pergunta sobre a marca:</span> “{ai.brandQuestion}”</p>
      </div>
      <div className="ai-answers__grid">
        {consulted.map((engine, index) => (
          <article className="ai-engine" key={engine.engine}>
            <header className="ai-engine__head"><strong>{consulted.length > 1 ? `IA ${index + 1}` : "Resposta da IA"}</strong>{engine.status === "error" && <span className="ai-engine__error">Sem resposta agora</span>}</header>
            {engine.status === "ok" && (
              <>
                <div className="ai-engine__flags">
                  {ai.recommendationQuestion && <AnswerFlag ok={engine.recommended} label={engine.recommended ? "Indicou sua empresa" : "Não indicou sua empresa"} />}
                  <AnswerFlag ok={engine.knowsBrand} label={engine.knowsBrand ? "Conhece sua empresa" : "Não conhece sua empresa"} />
                </div>
                {engine.recommendations.length > 0 && (
                  <div className="ai-engine__list">
                    <span>Empresas indicadas</span>
                    <ol>{engine.recommendations.map(name => <li key={name}>{name}</li>)}</ol>
                  </div>
                )}
                {engine.brandAnswer && <p className="ai-engine__answer">“{engine.brandAnswer}”</p>}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
