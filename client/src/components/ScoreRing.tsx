type ScoreRingProps = { score: number; label?: string; size?: "large" | "small" };

export function ScoreRing({ score, label = "AI Visibility Score", size = "large" }: ScoreRingProps) {
  const bounded = Math.max(0, Math.min(100, score));
  return (
    <div className={`score-ring score-ring--${size}`} style={{ "--score": `${bounded * 3.6}deg` } as React.CSSProperties} role="img" aria-label={`${label}: ${bounded} de 100`}>
      <div className="score-ring__inner">
        <span className="score-ring__label">{label}</span>
        <span className="score-ring__value">{bounded}<small>/100</small></span>
        <span className="score-ring__caption">sinais verificados</span>
      </div>
    </div>
  );
}
