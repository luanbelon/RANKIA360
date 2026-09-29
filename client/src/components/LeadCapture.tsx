import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, LockKeyhole, X } from "lucide-react";
import type { SiteAuditResult } from "@shared/audit-types";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";

type Completion = { received: boolean; reportUnlocked: boolean; message: string };
type LeadCaptureProps = { open: boolean; result: SiteAuditResult; onClose: () => void; onComplete: (response: Completion) => void };

export function LeadCapture({ open, result, onClose, onComplete }: LeadCaptureProps) {
  const [wantsConsultation, setWantsConsultation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitLead = trpc.audit.submitLead.useMutation();
  const saveDraft = trpc.audit.saveLeadDraft.useMutation();
  const draftId = useMemo(() => crypto.randomUUID(), [result.id]);
  const formRef = useRef<HTMLFormElement>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const lastDraft = useRef("");

  function readForm(consultation = wantsConsultation) {
    const data = new FormData(formRef.current ?? undefined);
    return {
      name: String(data.get("name") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      whatsapp: String(data.get("whatsapp") ?? "").trim(),
      wantsConsultation: consultation,
    };
  }

  function flushDraft(consultation = wantsConsultation) {
    window.clearTimeout(draftTimer.current);
    if (!formRef.current || submitLead.isPending || submitLead.isSuccess) return;
    const fields = readForm(consultation);
    if (!fields.name && !fields.company && !fields.email && !fields.whatsapp) return;
    const snapshot = JSON.stringify(fields);
    if (snapshot === lastDraft.current) return;
    lastDraft.current = snapshot;
    saveDraft.mutate({ draftId, auditId: result.id, website: result.domain, ...fields });
  }

  function scheduleDraft() {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => flushDraft(), 900);
  }

  useEffect(() => () => window.clearTimeout(draftTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>(".lead-modal");
    const focusable = () => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
    window.requestAnimationFrame(() => { const items = focusable(); (items[1] ?? items[0])?.focus(); });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { handleClose(); return; }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1]?.focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, onClose]);

  function handleClose() {
    flushDraft();
    onClose();
  }

  if (!open) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    window.clearTimeout(draftTimer.current);
    const data = new FormData(event.currentTarget);
    try {
      const response = await submitLead.mutateAsync({
        name: String(data.get("name") ?? ""),
        company: String(data.get("company") ?? ""),
        email: String(data.get("email") ?? ""),
        whatsapp: String(data.get("whatsapp") ?? ""),
        website: result.domain,
        wantsConsultation,
        auditId: result.id,
        draftId,
      });
      onComplete(response);
      trackEvent("lead_submitted", { delivered: response.received });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar sua solicitação.");
    }
  }

  const pending = result.findings.filter(item => item.priority !== "good").length;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) handleClose(); }}>
      <section className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-title" aria-describedby="lead-description">
        <button className="modal-close" type="button" onClick={handleClose} aria-label="Fechar formulário"><X size={18} /></button>

        <div className="lead-summary">
          <span className="lead-summary__score"><strong>{result.score}</strong><small>/100</small></span>
          <div className="lead-summary__info">
            <span className="lead-summary__domain">{result.domain}</span>
            <span className="lead-summary__count">{pending} {pending === 1 ? "ponto para melhorar" : "pontos para melhorar"}</span>
          </div>
        </div>

        <h2 id="lead-title">Libere o seu relatório <span>completo</span></h2>
        <p id="lead-description">Veja todos os pontos encontrados, o que corrigir primeiro e como fazer a sua empresa aparecer mais nas IAs.</p>

        <form ref={formRef} onSubmit={submit} onInput={scheduleDraft} onBlur={() => flushDraft()} className="lead-form">
          <div className="lead-form__grid">
            <label className="lead-field"><span className="lead-field__label">Seu nome</span><input name="name" type="text" autoComplete="name" maxLength={100} required placeholder="Como podemos chamar você?" /></label>
            <label className="lead-field"><span className="lead-field__label">Empresa</span><input name="company" type="text" autoComplete="organization" maxLength={120} required placeholder="Nome da empresa" /></label>
            <label className="lead-field"><span className="lead-field__label">E-mail</span><input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="voce@empresa.com.br" /></label>
            <label className="lead-field"><span className="lead-field__label">WhatsApp <em>opcional</em></span><input name="whatsapp" type="tel" autoComplete="tel" maxLength={32} placeholder="(11) 99999-9999" /></label>
          </div>

          <label className={`consent-card ${wantsConsultation ? "consent-card--checked" : ""}`}>
            <input type="checkbox" checked={wantsConsultation} onChange={event => { setWantsConsultation(event.target.checked); flushDraft(event.target.checked); }} />
            <span className="consent-card__box" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
            <span className="consent-card__text">
              <strong>Quero uma conversa gratuita com um especialista</strong>
              <small>Explicamos o resultado e mostramos por onde começar.</small>
            </span>
          </label>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <button className="button button--primary lead-submit" disabled={submitLead.isPending} type="submit">
            {submitLead.isPending ? <LoaderCircle size={17} className="spin" /> : null}
            {submitLead.isPending ? "Liberando relatório..." : "Ver relatório completo"}
            {!submitLead.isPending && <ArrowRight size={16} />}
          </button>
          <p className="lead-trust"><LockKeyhole size={13} /> Guardamos o que você preencher aqui para entrar em contato sobre o relatório. Não compartilhamos seus dados. Sem spam.</p>
        </form>
      </section>
    </div>
  );
}
