# Project tracker

## Completed MVP delivery

- [x] Create the premium dark/lime Portuguese landing page with reusable sections rather than a monolithic page component.
- [x] Add responsive sticky navigation, mobile menu, keyboard skip link, focus indicators, reduced-motion behavior, and accessible modal focus handling.
- [x] Run visual layout checks at 375, 430, 768, 1024, 1440, and 1920px.
- [x] Add working hero and final-CTA audit forms with distinct form IDs and result anchors.
- [x] Implement server-side public-page checks and a heuristic score based only on observable HTML/metadata signals.
- [x] Add SSRF defenses for URL/protocol/port validation, private/reserved IPs, DNS pinning, redirect revalidation, request timeouts, response-size caps, bounded request bodies, and per-IP rate limits.
- [x] Return clear client errors for private destinations and exercise the live audit API against `example.com`.
- [x] Reveal three findings before the optional report gate; do not store or forward lead data when no integration is configured.
- [x] Provide an optional HTTPS webhook adapter and explain its delivery status; no third-party connector, paid API, or database is required.
- [x] Add static document metadata, canonical/JSON-LD generation, manifest, favicon, `robots.txt`, and `sitemap.xml`.
- [x] Build the services, methodology, industry, agency, content-preview, FAQ, final CTA, and footer sections without fabricated client proof or platform integrations.
- [x] Document installation, scripts, architecture, security boundaries, environment variables, deployment choices, and future adapters in `README.md`.
- [x] Run `npm run check`, all 28 Vitest tests, `npm run build`, public URL/API smoke tests, private-IP rejection, and SEO endpoint checks.
- [x] Run axe-core WCAG 2.1/2.2 AA and best-practice checks on the base page, populated result, and open dialog with zero violations; verify skip-link, labels, focus-trap wrapping, Escape dismissal, and focus restoration.

## Launch prerequisites (values intentionally not invented)

The visual MVP is complete. Before collecting production leads or pointing a real domain to the site, its owner must choose the public HTTPS origin and set `PUBLIC_SITE_URL` plus `VITE_SITE_URL`. Contact delivery remains disabled until an approved HTTPS `LEAD_WEBHOOK_URL` is configured. The temporary brand name is retained as requested; final brand/legal details and any social URLs were not supplied, so no replacements or social links have been fabricated.

## Intentionally deferred from this first delivery

The user selected the managed React/Vite/Express implementation instead of the brief's original Next.js/Vercel stack. The Vercel migration is therefore not included; `README.md` records the required serverless/Next.js conversion before using Vercel. The initial MVP keeps audit results inline on `/`, with no history or database; dedicated `/analisar`, `/resultado/[id]`, service, contact, agency, and blog routes are future expansion points. Analytics vendors, CRM/email delivery beyond the optional webhook, competitor monitoring, platform-specific AI citations/rankings, and pricing are intentionally not included; no platform-specific visibility is claimed.

## Bug status

No known blocking defects remain in the delivered MVP. Repeat the type check, tests, build, and responsive/API checks after future code changes.
