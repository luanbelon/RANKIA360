import { useEffect, useState } from "react";
import { Check } from "lucide-react";

type TerminalLine = { at: number; text: (domain: string) => string };

// The audit is a single request, so these lines follow the real order of the work at its usual pace.
const lines: TerminalLine[] = [
  { at: 0, text: domain => `Acessando ${domain}` },
  { at: 1_800, text: () => "Site encontrado, lendo a página inicial" },
  { at: 4_500, text: () => "Conferindo se o site é seguro e carrega rápido" },
  { at: 7_500, text: () => "Lendo título, descrição e dados da empresa" },
  { at: 10_500, text: () => "Checando se o Google consegue ler o site" },
  { at: 13_500, text: domain => `Perguntando às IAs: "o que você sabe sobre ${domain}?"` },
  { at: 18_000, text: () => "Pedindo às IAs uma indicação de empresa do seu ramo" },
  { at: 23_000, text: () => "Conferindo se a sua empresa foi indicada" },
  { at: 28_000, text: () => "Vendo quem aparece no lugar da sua empresa" },
  { at: 33_000, text: () => "Calculando a sua nota" },
  { at: 39_000, text: () => "Quase lá, montando o seu relatório" },
];

const SLOW_AFTER_SECONDS = 45;

function displayDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "") || "seu site";
}

export function AnalysisTerminal({ domain }: { domain: string }) {
  const [elapsed, setElapsed] = useState(0);
  const site = displayDomain(domain);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 250);
    return () => window.clearInterval(timer);
  }, []);

  const shown = lines.filter(line => line.at <= elapsed);
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="analysis-terminal">
      <div className="analysis-terminal__bar" aria-hidden="true">
        <span className="analysis-terminal__dots"><i /><i /><i /></span>
        <span className="analysis-terminal__title">analisando {site}</span>
        <span className="analysis-terminal__time">{seconds}s</span>
      </div>
      <ol className="analysis-terminal__body" role="log" aria-live="polite" aria-label={`Análise de ${site} em andamento`}>
        {shown.map((line, index) => {
          const done = index < shown.length - 1;
          return (
            <li key={line.at} className={done ? "is-done" : "is-current"}>
              <span className="analysis-terminal__mark" aria-hidden="true">
                {done ? <Check size={13} strokeWidth={3} /> : ">"}
              </span>
              <span>
                {line.text(site)}
                {!done && <span className="analysis-terminal__cursor" aria-hidden="true" />}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="analysis-terminal__note">
        {seconds < SLOW_AFTER_SECONDS
          ? "Leva menos de 1 minuto. Pode deixar esta página aberta."
          : "As IAs estão demorando um pouco mais que o normal. Falta pouco, não feche a página."}
      </p>
    </div>
  );
}
