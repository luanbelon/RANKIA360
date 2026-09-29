import { useState, type FormEvent } from "react";
import { ArrowRight, Globe2, LoaderCircle, SearchCheck, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { AnalysisTerminal } from "@/components/AnalysisTerminal";
import { AuditResults } from "@/components/AuditResults";
import type { SiteAuditResult } from "@shared/audit-types";

type DomainAnalyzerProps = {
  idPrefix?: string;
  onResult?: (result: SiteAuditResult) => void;
};

export function DomainAnalyzer({ idPrefix = "hero", onResult }: DomainAnalyzerProps) {
  const [domain, setDomain] = useState("");
  const audit = trpc.audit.analyze.useMutation();
  const inputId = `domain-input-${idPrefix}`;
  const assuranceId = `audit-assurance-${idPrefix}`;
  const resultId = `audit-result-${idPrefix}`;
  const anchorId = idPrefix === "hero" ? "auditoria" : `auditoria-${idPrefix}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = domain.trim();
    if (!value) return;
    trackEvent("audit_started");
    try {
      const result = await audit.mutateAsync({ domain: value });
      trackEvent("audit_completed", { score: result.score });
      if (onResult) {
        onResult(result);
        return;
      }
      window.setTimeout(() => {
        document.getElementById(resultId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      // The mutation's error state is rendered below
    }
  }

  return (
    <div className="analyzer-wrap" id={anchorId}>
      <form 
        className="analyzer-form" 
        onSubmit={submit} 
        aria-label={`Análise gratuita do domínio — ${idPrefix === "hero" ? "formulário principal" : "chamada final"}`}
      >
        <label className="sr-only" htmlFor={inputId}>Domínio da empresa</label>
        <span className="analyzer-form__icon">
          <Globe2 size={22} aria-hidden="true" />
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={domain}
          onChange={event => { 
            setDomain(event.target.value); 
            if (audit.error) audit.reset(); 
          }}
          placeholder="seudominio.com.br"
          aria-describedby={assuranceId}
          required
          maxLength={253}
        />
        <button 
          className="button button--primary analyzer-form__submit" 
          type="submit" 
          disabled={audit.isPending}
        >
          {audit.isPending ? (
            <LoaderCircle className="spin" size={19} aria-hidden="true" />
          ) : (
            <SearchCheck size={19} aria-hidden="true" />
          )}
          <span>{audit.isPending ? "Analisando..." : "Analisar meu site"}</span>
          {!audit.isPending && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>

      <div className="analyzer-assurance" id={assuranceId}>
        <span className="assurance-item">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Análise inicial gratuita</span>
        </span>
        <span className="assurance-dot" aria-hidden="true">•</span>
        <span className="assurance-item">
          <span>Sem cartão de crédito</span>
        </span>
        <span className="assurance-dot" aria-hidden="true">•</span>
        <span className="assurance-item">
          <span>Resultado em menos de 1 minuto</span>
        </span>
      </div>

      {audit.isPending && <AnalysisTerminal domain={audit.variables?.domain ?? domain} />}

      {audit.error && (
        <p className="form-error" role="alert">{audit.error.message}</p>
      )}

      {audit.data && !onResult && <AuditResults result={audit.data} id={resultId} />}
    </div>
  );
}
