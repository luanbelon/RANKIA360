import type { Express, Request, Response } from "express";
import { brand } from "../shared/brand";
import { getSeoPage, renderLlmsTxt, renderSeoBody, renderSeoHead, seoPages } from "../shared/seo";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[character] ?? character);
}

export function siteOrigin(req: Request): string {
  const configured = process.env.PUBLIC_SITE_URL?.trim() || brand.siteUrl;
  try {
    const protocol = process.env.NODE_ENV === "production" ? "https:" : `${req.protocol}:`;
    const url = new URL(configured || `${protocol}//${req.get("host") || "localhost:3000"}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Invalid site URL");
    return url.origin;
  } catch {
    return "https://example.invalid";
  }
}

export function injectSeo(template: string, req: Request): string {
  const page = getSeoPage(req.originalUrl);
  if (!page) {
    return template.replace("<!--seo-head:end-->", `<!--seo-head:end-->\n    <meta name="robots" content="noindex" />`);
  }
  const origin = siteOrigin(req);
  return template
    .replace(/<!--seo-head:start-->[\s\S]*?<!--seo-head:end-->/, renderSeoHead(page, origin))
    .replace("<!--seo-body-->", renderSeoBody(page));
}

export function registerSeoRoutes(app: Express): void {
  app.get("/robots.txt", (req: Request, res: Response) => {
    const origin = siteOrigin(req);
    const aiRules = AI_CRAWLERS.map(agent => `User-agent: ${agent}\nAllow: /\n`).join("\n");
    res
      .type("text/plain; charset=utf-8")
      .send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\n${aiRules}\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const origin = escapeXml(siteOrigin(req));
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = Object.values(seoPages)
      .map(page => {
        const priority = page.path === "/" ? "1.0" : "0.8";
        return `<url><loc>${origin}${page.path}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
      })
      .join("");
    res
      .type("application/xml; charset=utf-8")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });

  app.get("/llms.txt", (req: Request, res: Response) => {
    res.type("text/plain; charset=utf-8").send(renderLlmsTxt(siteOrigin(req)));
  });
}
