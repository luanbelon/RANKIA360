# RankIA 360

Landing page and free, first-party domain audit for a temporary brand focused on SEO, AEO, GEO, and AI Search readiness.

> **Stack note:** At your direction, this implementation uses the managed WebDev **React + Vite + Express + tRPC** scaffold. It is not the Next.js App Router project described in the original brief. The interface and audit are implemented in that selected stack; see Deployment for the current runtime boundaries.

## Requirements

- Node.js 20.9+ (the managed environment uses Node 22)
- npm 10+ or pnpm 10+

## Install and run

```bash
npm install
npm run dev
```

The managed dev server serves the Vite app and Express/tRPC API on port 3000. A database is not used by this MVP.

## Build and checks

```bash
npm run check
npm test
npm run build
npm run start
```

The site uses the existing project scripts. `npm run build` creates the Vite client bundle and compiles the Express server entrypoint.

## Project structure

```text
client/
  index.html                  Static title, description, Open Graph, Twitter metadata
  public/                     Favicon and web manifest
  src/
    components/               Score ring, domain analyzer, report and lead dialog, JSON-LD
    sections/                 Header, hero, search shift, system, services, methodology,
                              industries, agency, insights, FAQ, CTA, footer
    lib/                      tRPC client and future analytics event adapter
    pages/Home.tsx            Small composition root
    index.css                 Responsive visual system and reduced-motion styles
server/
  services/site-audit.ts      SSRF-protected HTML and metadata checks/scoring
  services/site-audit.test.ts Address guard tests
  seo-routes.ts               Dynamic robots.txt and sitemap.xml
  routers.ts                  Public audit and optional lead-webhook procedures
shared/
  brand.ts                    Temporary name and primary color
  audit-types.ts              Shared result and input contracts
```

The current build is the complete one-page home experience; the audit results render inline after analysis. Dedicated `/analisar`, `/resultado/[id]`, service-detail, and blog routes remain future work, and no audit history is saved.

## Audit behavior and safety

- The browser sends the domain to a server-side procedure. The service only fetches HTTP(S) on standard ports, resolves the destination, rejects private/reserved IPs, pins requests to a checked address, and validates every redirect.
- It uses bounded request times, redirect count, body size, and basic in-memory per-IP throttling. It does not execute the analyzed page's JavaScript or store audit results.
- Signals include HTTPS, title, description, canonical, robots.txt, sitemap.xml, H1, viewport, Open Graph/Twitter tags, JSON-LD types, institutional links, authorship hints, internal links, word count, and image alt attributes.
- The displayed scores are heuristic summaries of public technical/editorial signals. They do **not** measure Google rankings, traffic, backlinks, or citations/recommendations in ChatGPT, Gemini, Perplexity, AI Overviews, or any other AI platform.
- The “preview” in the hero is explicitly illustrative, not an audit or client result.
- Invalid, private, or reserved destinations return a client error; temporary rate caps return a too-many-requests response.

## Lead delivery

No CRM, database, paid API, or analytics provider is mandatory. Without a webhook, report data is revealed in the current browser session and the app explicitly says that the submitted lead was not stored or delivered. To forward submissions to a free form endpoint or CRM webhook, set `LEAD_WEBHOOK_URL` on the server. It must be an HTTPS URL on the standard port; webhook requests are bounded and use the same public-IP and redirect protections.

The optional webhook receives `name`, `company`, `email`, `whatsapp`, `website`, `wantsConsultation`, `auditId`, `submittedAt`, and `source`. Do not enable it until the destination's privacy/retention behavior is appropriate for your organization.

## Environment variables

Set these values in your local shell or deployment environment. Do not commit actual webhook URLs if they contain secret tokens.

- `PUBLIC_SITE_URL` — canonical public origin used by `robots.txt` and `sitemap.xml` (for example, `https://www.your-domain.com`); set this in production.
- `VITE_SITE_URL` — public origin used by the browser to construct the canonical URL and JSON-LD identifiers. It is a public value, not a secret.
- `LEAD_WEBHOOK_URL` — optional, server-only HTTPS webhook. Keep it out of any `VITE_` variable.
- `PORT` — server port; defaults to `3000` in the current scaffold.

The company name is still temporary. Change it once in `shared/brand.ts`; update the matching static document title / OG name in `client/index.html` and manifest when the identity is finalized. The lime accent is selected centrally in `shared/brand.ts` and passed to the design system as a CSS variable.

## SEO and accessibility

The document shell includes Portuguese language, title/description, Open Graph, Twitter card, referrer and theme metadata. The app adds Organization, WebSite, WebPage, Service, and FAQPage JSON-LD using the visible FAQ copy, a canonical link, and the server serves robots and sitemap endpoints. No customer cases, company logos, social accounts, testimonials, metrics, or platform integrations are fabricated. The UI adapts to mobile breakpoints and honors `prefers-reduced-motion`.

## Deployment

### Current managed runtime

The app is initialized in the managed WebDev environment and can be previewed there. Its Express server is part of the working runtime. Set `PUBLIC_SITE_URL`, `VITE_SITE_URL`, and (optionally) `LEAD_WEBHOOK_URL` in the deployment environment before a production launch.

### Vercel

This version is **not a one-click Vercel deployment**: it uses the managed Express server and Vite client rather than Next.js App Router or Vercel Functions. To deploy on Vercel, migrate the audit procedure and SEO endpoints into Vercel-compatible serverless functions (or restore the Next.js App Router architecture), then test the outbound DNS/IP pinning and response limits in Vercel's runtime. Do not remove the SSRF protections during that migration.

For a future Next.js implementation, use the [official Next.js App Router installation guide](https://nextjs.org/docs/app/getting-started/installation) for current framework and runtime requirements.

## Future integrations

- **Analytics:** `client/src/lib/analytics.ts` dispatches privacy-neutral local events and is the adapter seam for Plausible, PostHog, or GA.
- **CRM/email:** `LEAD_WEBHOOK_URL` is the server-side adapter seam; a durable provider should be selected and configured before collecting live leads.
- **Historical audits/accounts/competitors:** not implemented; results currently exist only in page state.
- **AI citations and rankings:** not measured. A future feature should only make platform-specific claims after a real, documented data source is integrated.
