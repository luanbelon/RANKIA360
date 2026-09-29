import { useId } from "react";
import { brand } from "@shared/brand";

function LogoMark() {
  const glass = `rankia-glass-${useId().replace(/:/g, "")}`;
  return (
    <svg className="brand-symbol" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={glass} x1="4" y1="0" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e7ff6e" />
          <stop offset="0.46" stopColor="#8ed62b" />
          <stop offset="1" stopColor="#3b9412" />
        </linearGradient>
      </defs>
      <circle cx="26" cy="24" r="22" fill={`url(#${glass})`} />
      <circle cx="26" cy="24" r="14.4" fill="var(--bg)" />
      <circle cx="26" cy="24" r="8.8" fill={`url(#${glass})`} />
      <circle cx="26" cy="24" r="3.1" fill="var(--bg)" />
      <rect x="34" y="38" width="24" height="11" rx="5.5" transform="rotate(48 46 43.5)" fill={`url(#${glass})`} />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand-mark" href="/" aria-label={`${brand.name} — início`}>
      <LogoMark />
      {!compact && (
        <span className="brand-wordmark">
          <strong>Rank<span className="brand-wordmark__ia">IA</span>360</strong>
          <small>Visibilidade na era da <em>IA</em></small>
        </span>
      )}
    </a>
  );
}
