import type { ReactNode } from "react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";

export type DashboardCategory = { key: string; label: string; score: number | null; note: string };

type VisibilityDashboardProps = {
  domain: string;
  score: number;
  opportunities: number;
  summary: ReactNode;
  meta: string;
  categories: DashboardCategory[];
  foot: ReactNode;
  variant?: "demo" | "result";
};

export function VisibilityDashboard({ domain, score, opportunities, summary, meta, categories, foot, variant = "demo" }: VisibilityDashboardProps) {
  return (
    <div className={`dashboard-card ${variant === "result" ? "dashboard-card--result" : ""}`}>
      <div className="dashboard-top">
        <div className="dashboard-app-badge">
          <span className="window-dots">
            <span className="w-dot red" />
            <span className="w-dot yellow" />
            <span className="w-dot green" />
          </span>
          <span className="dashboard-app-title">
            AI Visibility Score™ <span className="app-badge">{variant === "result" ? "Seu resultado" : "v2.4 Live"}</span>
          </span>
        </div>
        <div className="dashboard-sample-status">
          <span className="sample-pulse" />
          <span className="sample-domain">{domain}</span>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-score-block">
          <span className="dashboard-score__label">AI VISIBILITY SCORE</span>
          <div className="dashboard-score__number">
            <span className="score-value">{score}</span>
            <span className="score-total">/100</span>
          </div>
          {opportunities > 0 ? (
            <div className="dashboard-opportunities-badge">
              <AlertCircle size={15} />
              <span><strong>{opportunities} {opportunities === 1 ? "oportunidade" : "oportunidades"}</strong> {opportunities === 1 ? "encontrada" : "encontradas"}</span>
            </div>
          ) : (
            <div className="dashboard-opportunities-badge dashboard-opportunities-badge--good">
              <CheckCircle2 size={15} />
              <span><strong>Nenhum ajuste urgente</strong></span>
            </div>
          )}
        </div>

        <div className="dashboard-status-box">
          <div className="status-box-header">
            <Activity size={15} />
            <span>RESUMO</span>
          </div>
          <p className="status-box-text">{summary}</p>
          <div className="status-box-meta">
            <span>{meta}</span>
            <span className="meta-tag">{categories.length} pontos analisados</span>
          </div>
        </div>
      </div>

      <div className="dashboard-divider" />

      <div className="dashboard-signals">
        <div className="dashboard-signals__header">
          <span className="signals-title">NOTA POR PONTO ANALISADO</span>
          <span className="signals-baseline">0 A 100</span>
        </div>

        <div className="signals-list">
          {categories.map(cat => (
            <div className="dashboard-signal-row" key={cat.key}>
              <div className="signal-row-info">
                <span className="signal-name">{cat.label}</span>
                <span className="signal-note">{cat.note}</span>
              </div>
              {cat.score === null ? (
                <div className="signal-progress-track signal-progress-track--empty" aria-label={`${cat.label}: não medido`} />
              ) : (
                <div className="signal-progress-track" role="meter" aria-label={`${cat.label}: ${cat.score} de 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={cat.score}>
                  <div className="signal-progress-fill" style={{ width: `${cat.score}%` }} />
                </div>
              )}
              <span className="signal-score-num">{cat.score ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-foot">{foot}</div>
    </div>
  );
}
