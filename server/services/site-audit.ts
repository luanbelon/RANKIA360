import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import type { AiPresenceResult, AuditCategory, AuditCategoryKey, AuditFinding, SiteAuditResult } from "../../shared/audit-types";
import { renderPage } from "./page-renderer";
import { checkAiPresence } from "./ai-presence";

const THIN_CONTENT_WORDS = 200;
const MAX_HTML_BYTES = 1_500_000;
const MAX_SMALL_BYTES = 180_000;
const REQUEST_TIMEOUT_MS = 6_000;
const REDIRECT_LIMIT = 3;
const USER_AGENT = "AI-Search-Authority-Audit/1.0 (+public metadata checks)";

export class AuditError extends Error {
  constructor(message: string, public code = "AUDIT_FAILED") {
    super(message);
    this.name = "AuditError";
  }
}

type Address = { address: string; family: number };
type FetchTextOptions = { maxBytes?: number; method?: "GET" | "POST"; body?: string; contentType?: string };
type FetchTextResult = { url: URL; status: number; headers: http.IncomingHttpHeaders; text: string };

function ipv4Number(value: string): number | null {
  if (!isIP(value) || isIP(value) !== 4) return null;
  return value.split(".").reduce((sum, octet) => (sum * 256 + Number(octet)) >>> 0, 0) >>> 0;
}

function inV4Range(ip: number, network: string, prefix: number): boolean {
  const base = ipv4Number(network);
  if (base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ip & mask) === (base & mask);
}

function ipv6Words(value: string): number[] | null {
  if (isIP(value) !== 6) return null;
  const normalized = value.toLowerCase().split("%", 1)[0];
  const double = normalized.split("::");
  if (double.length > 2) return null;
  const left = double[0] ? double[0].split(":") : [];
  const right = double[1] ? double[1].split(":") : [];
  const expandV4 = (part: string) => {
    if (!part.includes(".")) return [part];
    const v4 = ipv4Number(part);
    if (v4 === null) return [];
    return [((v4 >>> 16) & 0xffff).toString(16), (v4 & 0xffff).toString(16)];
  };
  const expandedLeft = left.flatMap(expandV4);
  const expandedRight = right.flatMap(expandV4);
  const missing = 8 - expandedLeft.length - expandedRight.length;
  const words = double.length === 1 ? expandedLeft : [...expandedLeft, ...Array(Math.max(0, missing)).fill("0"), ...expandedRight];
  if (words.length !== 8) return null;
  const numbers = words.map(part => Number.parseInt(part || "0", 16));
  return numbers.every(n => Number.isFinite(n) && n >= 0 && n <= 0xffff) ? numbers : null;
}

/** Reject all non-global IPv4 and IPv6 destinations before making an outbound request. */
export function isPublicAddress(value: string): boolean {
  const address = value.replace(/^\[|\]$/g, "");
  const family = isIP(address);
  if (family === 4) {
    const ip = ipv4Number(address);
    if (ip === null) return false;
    const denied: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !denied.some(([network, prefix]) => inV4Range(ip, network, prefix));
  }
  if (family === 6) {
    const words = ipv6Words(address);
    if (!words) return false;
    // Public unicast IPv6 currently lives in 2000::/3. This conservative check
    // intentionally excludes unique-local, link-local, mapped, and special ranges.
    if ((words[0] & 0xe000) !== 0x2000) return false;
    const prefix = words.slice(0, 2).map(n => n.toString(16).padStart(4, "0")).join(":");
    if (prefix === "2001:0db8" || prefix === "2001:0000" || prefix === "2001:0002" || words[0] === 0x2002) return false;
    return true;
  }
  return false;
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function normalizeInput(input: string): URL {
  const raw = input.trim();
  if (!raw || raw.length > 253 || /[\u0000-\u0020\\]/.test(raw)) {
    throw new AuditError("Informe um domínio válido, como suaempresa.com.br.", "INVALID_URL");
  }
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new AuditError("Não foi possível interpretar esse domínio. Confira o endereço e tente novamente.", "INVALID_URL");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new AuditError("Use somente um endereço público HTTP ou HTTPS, sem credenciais.", "INVALID_URL");
  }
  const allowedPort = url.protocol === "https:" ? ["", "443"] : ["", "80"];
  if (!allowedPort.includes(url.port)) {
    throw new AuditError("Por segurança, a auditoria aceita apenas as portas padrão 80 e 443.", "INVALID_URL");
  }
  const host = hostnameOf(url);
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new AuditError("Este endereço não parece ser um domínio público.", "UNSAFE_HOST");
  }
  url.hash = "";
  return url;
}

async function resolvePublicAddresses(host: string): Promise<Address[]> {
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new AuditError("Endereços de rede privada ou reservada não podem ser analisados.", "UNSAFE_HOST");
    return [{ address: host, family: isIP(host) }];
  }
  let addresses: Address[];
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      addresses = await Promise.race([
        lookup(host, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("DNS timeout")), REQUEST_TIMEOUT_MS); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    throw new AuditError("Não foi possível localizar esse domínio publicamente.", "DNS_FAILED");
  }
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) {
    throw new AuditError("O domínio resolve para um endereço privado ou reservado e não pode ser analisado.", "UNSAFE_HOST");
  }
  return addresses;
}

function pinnedRequest(url: URL, address: Address, options: FetchTextOptions = {}): Promise<FetchTextResult> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const host = hostnameOf(url);
    const body = options.body;
    const headers: http.OutgoingHttpHeaders = {
      "user-agent": USER_AGENT,
      accept: options.method === "POST" ? "application/json" : "text/html,application/xhtml+xml,application/xml;q=0.8,text/plain;q=0.5,*/*;q=0.1",
      "accept-encoding": "identity",
      connection: "close",
      ...(body ? { "content-type": options.contentType ?? "application/json", "content-length": Buffer.byteLength(body) } : {}),
    };
    const req = transport.request({
      protocol: url.protocol,
      hostname: host,
      port: url.port || undefined,
      path: `${url.pathname || "/"}${url.search}`,
      method: options.method ?? "GET",
      headers,
      servername: isIP(host) ? undefined : host,
      lookup: (_lookupHost, lookupOptions, callback) => {
        const cb = typeof lookupOptions === "function" ? lookupOptions : callback;
        if (!cb) return;
        if (typeof lookupOptions === "object" && lookupOptions?.all) {
          (cb as (err: NodeJS.ErrnoException | null, addresses: Address[]) => void)(null, [address]);
        } else {
          (cb as (err: NodeJS.ErrnoException | null, address: string, family: number) => void)(null, address.address, address.family);
        }
      },
    }, response => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        resolve({ url: new URL(location, url), status, headers: response.headers, text: "" });
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      const maxBytes = options.maxBytes ?? MAX_HTML_BYTES;
      response.on("data", (chunk: Buffer | string) => {
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += data.length;
        if (bytes > maxBytes) {
          req.destroy(new AuditError("A página excede o limite de tamanho da auditoria.", "RESPONSE_TOO_LARGE"));
          return;
        }
        chunks.push(data);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ url, status, headers: response.headers, text: Buffer.concat(chunks).toString("utf8") }));
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new AuditError("O site demorou mais que o limite de tempo da auditoria.", "TIMEOUT")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function fetchPublicText(input: URL, options: FetchTextOptions = {}): Promise<FetchTextResult> {
  let current = new URL(input.toString());
  for (let redirects = 0; redirects <= REDIRECT_LIMIT; redirects += 1) {
    if (!["https:", "http:"].includes(current.protocol) || current.username || current.password) {
      throw new AuditError("O site redirecionou para um endereço não permitido.", "UNSAFE_REDIRECT");
    }
    const expectedPort = current.protocol === "https:" ? ["", "443"] : ["", "80"];
    if (!expectedPort.includes(current.port)) throw new AuditError("O redirecionamento usa uma porta não permitida.", "UNSAFE_REDIRECT");
    const host = hostnameOf(current);
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
      throw new AuditError("O site redirecionou para um endereço não permitido.", "UNSAFE_REDIRECT");
    }
    const addresses = await resolvePublicAddresses(host);
    const result = await pinnedRequest(current, addresses[0]!, options);
    if (![301, 302, 303, 307, 308].includes(result.status)) return result;
    if (redirects === REDIRECT_LIMIT) throw new AuditError("O site excedeu o limite de redirecionamentos.", "TOO_MANY_REDIRECTS");
    current = result.url;
    // A redirect during webhook delivery must never change the payload destination.
    if (options.method === "POST") throw new AuditError("O endpoint de recebimento redirecionou a solicitação.", "WEBHOOK_REDIRECT");
  }
  throw new AuditError("Não foi possível acessar esse domínio.");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)));
}

function cleanText(value: string): string {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[(match[1] ?? "").toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function hasMeta(html: string, keys: string[], attribute: "name" | "property" = "name"): boolean {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (keys.includes((attrs[attribute] ?? "").toLowerCase()) && Boolean(attrs.content?.trim())) return true;
  }
  return false;
}

function readMeta(html: string, key: string): string {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.name ?? "").toLowerCase() === key.toLowerCase() || (attrs.property ?? "").toLowerCase() === key.toLowerCase()) return attrs.content ?? "";
  }
  return "";
}

type JsonLdSummary = { types: string[]; name: string; city: string; sameAs: boolean; contact: boolean };

function readJsonLd(html: string): JsonLdSummary {
  const types = new Set<string>();
  const summary: JsonLdSummary = { types: [], name: "", city: "", sameAs: false, contact: false };
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/application\/ld\+json/i.test(script[1] ?? "")) continue;
    try {
      const parsed = JSON.parse(script[2] ?? "");
      const visit = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(visit);
        const object = value as Record<string, unknown>;
        const type = object["@type"];
        const typeList = (Array.isArray(type) ? type : [type]).filter((item): item is string => typeof item === "string");
        typeList.forEach(item => types.add(item));
        const isOrganization = typeList.some(item => /organization|business|corporation|store|restaurant|clinic|dentist|attorney|legalservice|medical/i.test(item));
        if (isOrganization && !summary.name && typeof object.name === "string") summary.name = object.name.trim().slice(0, 80);
        if (object.sameAs) summary.sameAs = true;
        if (object.telephone || object.email || object.contactPoint || object.address) summary.contact = true;
        if (!summary.city && typeof object.addressLocality === "string") summary.city = object.addressLocality.trim().slice(0, 60);
        Object.values(object).forEach(visit);
      };
      visit(parsed);
    } catch {
      // Malformed JSON-LD is not considered a valid structured-data signal.
    }
  }
  summary.types = [...types].sort();
  return summary;
}

function hasLinkTo(html: string, tokens: string[], base: URL): boolean {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!attrs.href) continue;
    try {
      const target = new URL(attrs.href, base);
      const path = `${target.pathname} ${attrs.href}`.toLowerCase();
      if (target.hostname === base.hostname && tokens.some(token => path.includes(token))) return true;
    } catch {
      // Ignore malformed href values.
    }
  }
  return false;
}

const SOCIAL_HOSTS = /(?:^|\.)(?:instagram\.com|facebook\.com|linkedin\.com|youtube\.com|tiktok\.com|x\.com|twitter\.com|threads\.net|wa\.me|whatsapp\.com)$/i;

function hasSocialLinks(html: string, base: URL): boolean {
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributes(match[0]).href;
    if (!href) continue;
    try {
      if (SOCIAL_HOSTS.test(new URL(href, base).hostname)) return true;
    } catch {
      // Ignore malformed href values.
    }
  }
  return false;
}

/** Evaluates the `User-agent: *` group the way Google does: the longest matching rule wins, ties favor Allow. */
function robotsAllows(robotsText: string, path: string): boolean {
  const rules: Array<{ allow: boolean; pattern: string }> = [];
  let inWildcardGroup = false;
  let lastWasAgent = false;
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const field = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    if (field === "user-agent") {
      inWildcardGroup = lastWasAgent ? inWildcardGroup || value === "*" : value === "*";
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (inWildcardGroup && (field === "allow" || field === "disallow") && value) rules.push({ allow: field === "allow", pattern: value });
  }
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    const body = rule.pattern.endsWith("$") ? rule.pattern.slice(0, -1) : rule.pattern;
    const regex = new RegExp(`^${body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}${rule.pattern.endsWith("$") ? "$" : ""}`);
    if (!regex.test(path)) continue;
    if (!best || rule.pattern.length > best.length || (rule.pattern.length === best.length && rule.allow)) {
      best = { allow: rule.allow, length: rule.pattern.length };
    }
  }
  return best ? best.allow : true;
}

function bodyText(html: string): string {
  return cleanText(html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? html);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** A redirect-safe guard for every request the headless browser makes. */
async function isAllowedBrowserTarget(url: URL): Promise<boolean> {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  const expectedPort = url.protocol === "https:" ? ["", "443"] : ["", "80"];
  if (!expectedPort.includes(url.port)) return false;
  const host = hostnameOf(url);
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  try {
    await resolvePublicAddresses(host);
    return true;
  } catch {
    return false;
  }
}

type Signals = SiteAuditResult["signals"];
type Check = { ok: boolean; weight?: number };

const CATEGORY_WEIGHTS: Record<AuditCategoryKey, number> = { technical: 20, content: 20, entity: 20, structuredData: 15, aiPresence: 25 };

function percent(checks: Check[]): number {
  const total = checks.reduce((sum, check) => sum + (check.weight ?? 1), 0);
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight ?? 1 : 0), 0);
  return Math.round((earned / Math.max(total, 1)) * 100);
}

function aiPresenceScore(ai: AiPresenceResult | null): number | null {
  const answered = ai?.engines.filter(item => item.status === "ok") ?? [];
  if (!ai || !answered.length) return null;
  const perEngine = answered.map(item => ai.recommendationQuestion
    ? (item.knowsBrand ? 40 : 0) + (item.recommended ? 60 : 0)
    : item.knowsBrand ? 100 : 0);
  return Math.round(perEngine.reduce((sum, value) => sum + value, 0) / perEngine.length);
}

function scoreCategories(signals: Signals, ai: AiPresenceResult | null): AuditCategory[] {
  const technical = percent([
    { ok: signals.https, weight: 2 }, { ok: signals.indexable, weight: 3 }, { ok: signals.robotsTxt }, { ok: signals.sitemap },
    { ok: signals.canonical }, { ok: signals.mobileViewport }, { ok: signals.visibleWithoutJs, weight: 2 },
  ]);
  const content = percent([
    { ok: signals.title, weight: 2 }, { ok: signals.metaDescription }, { ok: signals.singleH1 }, { ok: signals.enoughText, weight: 2 },
    { ok: signals.subheadings }, { ok: signals.internalLinking }, { ok: signals.answersQuestions },
  ]);
  const entity = percent([
    { ok: signals.aboutPage }, { ok: signals.contactPage }, { ok: signals.contactInfo, weight: 2 },
    { ok: signals.address }, { ok: signals.socialProfiles }, { ok: signals.openGraph },
  ]);
  const structuredData = percent([
    { ok: signals.structuredData }, { ok: signals.organizationSchema, weight: 2 }, { ok: signals.sameAs },
    { ok: signals.schemaContact }, { ok: signals.contentSchema },
  ]);
  const aiScore = aiPresenceScore(ai);
  return [
    { key: "technical", label: "Saúde técnica", score: technical, measured: true, status: technical >= 75 ? "Boa base técnica" : "Base técnica a fortalecer", explanation: "Acesso seguro, indexação, robots.txt, sitemap, versão para celular e conteúdo legível sem JavaScript." },
    { key: "content", label: "Conteúdo", score: content, measured: true, status: content >= 70 ? "Conteúdo bem estruturado" : "Conteúdo a desenvolver", explanation: "Título, descrição, títulos da página, volume de texto, links internos e respostas a perguntas." },
    { key: "entity", label: "Marca", score: entity, measured: true, status: entity >= 70 ? "Empresa bem identificada" : "Empresa pouco identificada", explanation: "Página institucional, contato, telefone ou e-mail, endereço, perfis sociais e cartão de compartilhamento." },
    { key: "structuredData", label: "Informações para robôs", score: structuredData, measured: true, status: structuredData >= 60 ? "Dados bem descritos" : "Dados pouco descritos", explanation: "Dados estruturados (schema.org) que descrevem a empresa, contatos, perfis e serviços para as máquinas." },
    aiScore === null
      ? { key: "aiPresence", label: "Presença nas IAs", score: 0, measured: false, status: "Não medido", explanation: "Não foi possível consultar as IAs nesta análise." }
      : { key: "aiPresence", label: "Presença nas IAs", score: aiScore, measured: true, status: aiScore >= 60 ? "Lembrada pelas IAs" : "Pouco lembrada pelas IAs", explanation: "Perguntamos às IAs, como um cliente faria, se conhecem e se indicam a sua empresa." },
  ];
}

function overallScore(categories: AuditCategory[]): number {
  const measured = categories.filter(item => item.measured);
  const weight = measured.reduce((sum, item) => sum + CATEGORY_WEIGHTS[item.key], 0);
  return Math.round(measured.reduce((sum, item) => sum + item.score * CATEGORY_WEIGHTS[item.key], 0) / Math.max(weight, 1));
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

function makeFindings(signals: Signals, metrics: SiteAuditResult["metrics"], rendering: SiteAuditResult["rendering"], ai: AiPresenceResult | null): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const add = (priority: AuditFinding["priority"], id: string, title: string, description: string, category: string) => findings.push({ priority, id, title, description, category });

  const answered = ai?.engines.filter(item => item.status === "ok") ?? [];
  if (ai && answered.length) {
    const recommendedBy = answered.filter(item => item.recommended).map(item => item.label);
    const knownBy = answered.filter(item => item.knowsBrand).map(item => item.label);
    const competitors = Array.from(new Set(answered.flatMap(item => item.recommendations))).slice(0, 4);
    if (ai.recommendationQuestion && !recommendedBy.length) {
      add("high", "ai-not-recommended", "As IAs não indicaram a sua empresa",
        `Perguntamos "${ai.recommendationQuestion}" e a sua empresa não apareceu nas respostas.${competitors.length ? ` Foram indicadas: ${joinNames(competitors)}.` : ""}`, "Presença nas IAs");
    } else if (ai.recommendationQuestion && recommendedBy.length < answered.length) {
      add("opportunity", "ai-partially-recommended", "Indicada por apenas parte das IAs",
        `Nas outras IAs consultadas, a sua empresa não apareceu quando perguntamos "${ai.recommendationQuestion}".`, "Presença nas IAs");
    }
    if (!knownBy.length) {
      add("high", "ai-unknown-brand", "As IAs não reconhecem a sua empresa",
        "Quando perguntamos diretamente sobre a sua empresa, nenhuma IA encontrou informações confiáveis. Isso costuma indicar poucas menções e dados inconsistentes na internet.", "Presença nas IAs");
    } else if (knownBy.length < answered.length) {
      add("opportunity", "ai-partially-known", "Parte das IAs não reconhece a sua empresa",
        "Parte das IAs consultadas não encontrou informações confiáveis sobre a sua empresa.", "Presença nas IAs");
    }
  }

  if (rendering.jsDependent) {
    add("high", "js-dependent", "O conteúdo só aparece com JavaScript",
      "Os robôs das IAs, como os do ChatGPT e do Perplexity, geralmente não executam JavaScript e podem ver a sua página vazia. Avaliamos a versão completa, mas o ideal é entregar o conteúdo já no HTML (renderização no servidor ou pré-renderização).", "Saúde técnica");
  }
  if (!signals.indexable) add("high", "indexable", "A página está bloqueada para buscadores", "Há uma instrução noindex ou um bloqueio no robots.txt que impede o Google e as IAs de lerem esta página.", "Saúde técnica");
  if (!signals.https) add("high", "https", "O site não usa conexão segura (HTTPS)", "Use HTTPS em todas as páginas e redirecione a versão HTTP para a segura.", "Saúde técnica");
  if (!signals.robotsTxt) add("opportunity", "robots", "Arquivo robots.txt não encontrado", "Publique um robots.txt que diga aos robôs o que podem ler e onde está o sitemap.", "Saúde técnica");
  if (!signals.sitemap) add("opportunity", "sitemap", "Sitemap não encontrado", "Um sitemap.xml ajuda o Google e as IAs a descobrirem todas as páginas importantes.", "Saúde técnica");
  if (!signals.canonical) add("opportunity", "canonical", "Endereço principal da página não definido", "Uma tag canonical indica qual endereço é a versão oficial da página e evita conteúdo duplicado.", "Saúde técnica");
  if (!signals.mobileViewport) add("opportunity", "viewport", "Página não configurada para celular", "Inclua a meta viewport para a página se adaptar a telas pequenas.", "Saúde técnica");

  if (!signals.title) add("high", "title", "Título da página ausente ou fora do tamanho ideal", "Use um título único, entre 10 e 70 caracteres, que diga o que a empresa faz.", "Conteúdo");
  if (!signals.metaDescription) add("opportunity", "description", "Descrição da página não encontrada", "Escreva uma descrição objetiva do que a empresa oferece; ela aparece no Google e ajuda as IAs a resumirem o site.", "Conteúdo");
  if (metrics.h1Count === 0) add("high", "h1", "Título principal (H1) não encontrado", "Use um H1 claro para apresentar o assunto central da página.", "Conteúdo");
  else if (metrics.h1Count > 1) add("opportunity", "multiple-h1", "Mais de um título principal (H1)", "Mantenha um único H1 para deixar claro o tema principal da página.", "Conteúdo");
  if (!signals.enoughText) add("opportunity", "content-depth", "Pouco texto na página", `Encontramos cerca de ${metrics.wordCount} palavras. Explique melhor o que a empresa faz, para quem e onde atende.`, "Conteúdo");
  if (!signals.subheadings) add("opportunity", "subheadings", "Poucos subtítulos organizando o conteúdo", "Divida o conteúdo em seções com subtítulos (H2) para facilitar a leitura de pessoas e IAs.", "Conteúdo");
  if (!signals.internalLinking) add("opportunity", "internal-links", "Poucos links para outras páginas do site", "Ligue a página inicial às páginas de serviços, sobre e contato para mostrar a estrutura do site.", "Conteúdo");
  if (!signals.answersQuestions) add("opportunity", "questions", "A página não responde perguntas dos clientes", "Inclua perguntas frequentes com respostas diretas; é o formato que as IAs mais usam para montar respostas.", "Conteúdo");
  if (metrics.imagesWithoutAlt > 0) add("opportunity", "image-alt", `${metrics.imagesWithoutAlt} ${metrics.imagesWithoutAlt === 1 ? "imagem sem descrição" : "imagens sem descrição"}`, "Descreva as imagens informativas com texto alternativo (alt).", "Conteúdo");

  if (!signals.aboutPage) add("opportunity", "about", "Página Sobre não encontrada", "Uma página institucional ajuda pessoas e IAs a entenderem quem está por trás da empresa.", "Marca");
  if (!signals.contactPage) add("opportunity", "contact", "Página de contato não encontrada", "Deixe uma página de contato acessível a partir da página inicial.", "Marca");
  if (!signals.contactInfo) add("high", "contact-info", "Telefone ou e-mail não encontrados", "Mostre telefone, WhatsApp ou e-mail na página; são dados que confirmam que a empresa é real.", "Marca");
  if (!signals.address) add("opportunity", "address", "Endereço não encontrado", "Se atende presencialmente, mostre o endereço completo. Ele é essencial para indicações locais.", "Marca");
  if (!signals.socialProfiles) add("opportunity", "social", "Perfis sociais não vinculados", "Linke os perfis oficiais (Instagram, LinkedIn etc.) para as IAs confirmarem que são da mesma empresa.", "Marca");
  if (!signals.openGraph) add("opportunity", "og", "Cartão de compartilhamento incompleto", "Configure as tags Open Graph para a página aparecer com título, descrição e imagem ao ser compartilhada.", "Marca");

  if (!signals.structuredData) add("high", "schema", "Nenhum dado estruturado encontrado", "Adicione dados estruturados (schema.org) descrevendo a empresa: nome, contato, endereço e serviços.", "Informações para robôs");
  else {
    if (!signals.organizationSchema) add("opportunity", "org-schema", "A empresa não está descrita nos dados estruturados", "Inclua um Organization ou LocalBusiness com os dados reais da empresa.", "Informações para robôs");
    if (!signals.sameAs) add("opportunity", "same-as", "Perfis oficiais não informados aos robôs", "Use a propriedade sameAs para listar os perfis oficiais da empresa.", "Informações para robôs");
    if (!signals.schemaContact) add("opportunity", "schema-contact", "Contato ausente nos dados estruturados", "Informe telefone, e-mail ou endereço nos dados estruturados.", "Informações para robôs");
    if (!signals.contentSchema) add("opportunity", "content-schema", "Serviços e perguntas não descritos aos robôs", "Descreva serviços, produtos ou perguntas frequentes com os tipos Service, Product ou FAQPage.", "Informações para robôs");
  }

  if (findings.length === 0) add("good", "baseline", "Todos os pontos verificados estão em ordem", "Não encontramos problemas nos itens avaliados nesta página.", "Resumo");
  const order = { high: 0, opportunity: 1, good: 2 } as const;
  return findings.sort((a, b) => order[a.priority] - order[b.priority]);
}

export async function analyzePublicSite(input: string): Promise<SiteAuditResult> {
  const requested = normalizeInput(input);
  const response = await fetchPublicText(requested, { maxBytes: MAX_HTML_BYTES });
  const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
  if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new AuditError("O endereço não respondeu com uma página HTML que possa ser analisada.", "NOT_HTML");
  }
  if (response.status < 200 || response.status >= 400) {
    throw new AuditError("Não conseguimos abrir a página inicial desse site. Confira o endereço e tente novamente.", "HTTP_ERROR");
  }

  const base = response.url;
  const rawHtml = response.text;
  const rawWordCount = countWords(bodyText(rawHtml));

  const robotsUrl = new URL("/robots.txt", base);
  const sitemapUrl = new URL("/sitemap.xml", base);
  const [robotsResult, sitemapResult, renderedResult] = await Promise.allSettled([
    fetchPublicText(robotsUrl, { maxBytes: MAX_SMALL_BYTES }),
    fetchPublicText(sitemapUrl, { maxBytes: MAX_SMALL_BYTES }),
    rawWordCount < THIN_CONTENT_WORDS ? renderPage(base, isAllowedBrowserTarget, USER_AGENT) : Promise.resolve(null),
  ]);

  const renderedHtml = renderedResult.status === "fulfilled" ? renderedResult.value : null;
  const renderedWordCount = renderedHtml ? countWords(bodyText(renderedHtml)) : 0;
  const useRendered = Boolean(renderedHtml) && renderedWordCount > rawWordCount;
  const html = useRendered ? renderedHtml! : rawHtml;
  const rendering: SiteAuditResult["rendering"] = {
    usedBrowser: Boolean(renderedHtml),
    jsDependent: rawWordCount < THIN_CONTENT_WORDS && (useRendered ? renderedWordCount >= rawWordCount * 2 + 80 : rawWordCount < 60),
  };

  const text = bodyText(html);
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "").slice(0, 240);
  const description = readMeta(html, "description").trim().slice(0, 320);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].some(match => {
    const attrs = attributes(match[0]);
    return (attrs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical") && Boolean(attrs.href);
  });
  const h1Count = [...html.matchAll(/<h1\b[^>]*>/gi)].length;
  const h1Text = cleanText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] ?? "").slice(0, 200);
  const h2Count = [...html.matchAll(/<h2\b[^>]*>/gi)].length;
  const questionHeadings = [...html.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]\s*>/gi)].filter(match => cleanText(match[1] ?? "").endsWith("?")).length;
  const jsonLd = readJsonLd(html);
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imagesWithoutAlt = imageTags.filter(match => !Object.prototype.hasOwnProperty.call(attributes(match[0]), "alt")).length;
  let internalLinks = 0;
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributes(match[0]).href;
    if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) continue;
    try { if (new URL(href, base).hostname === base.hostname) internalLinks += 1; } catch { /* malformed link */ }
  }

  const robotsText = robotsResult.status === "fulfilled" && robotsResult.value.status >= 200 && robotsResult.value.status < 300 ? robotsResult.value.text : "";
  const sitemap = sitemapResult.status === "fulfilled" && sitemapResult.value.status >= 200 && sitemapResult.value.status < 300 && /(?:<urlset\b|<sitemapindex\b)/i.test(sitemapResult.value.text);
  const noindex = /<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])/i.test(rawHtml);
  const robotsDisallowAll = !robotsAllows(robotsText, `${base.pathname || "/"}`);
  const types = jsonLd.types.map(type => type.toLowerCase());
  const hasType = (pattern: RegExp) => types.some(type => pattern.test(type));

  const signals: Signals = {
    https: base.protocol === "https:",
    indexable: !noindex && !robotsDisallowAll,
    robotsTxt: Boolean(robotsText),
    sitemap,
    canonical,
    mobileViewport: /<meta\b[^>]*name=["']viewport["']/i.test(html),
    visibleWithoutJs: !rendering.jsDependent,
    title: title.length >= 10 && title.length <= 70,
    metaDescription: description.length >= 50,
    singleH1: h1Count === 1,
    enoughText: countWords(text) >= 300,
    subheadings: h2Count >= 2,
    internalLinking: internalLinks >= 5,
    answersQuestions: questionHeadings >= 2 || hasType(/faqpage/),
    aboutPage: hasLinkTo(html, ["sobre", "about", "quem-somos", "equipe", "institucional", "empresa"], base),
    contactPage: hasLinkTo(html, ["contato", "contact", "fale-conosco", "atendimento"], base),
    contactInfo: /href=["'](?:tel:|mailto:|https?:\/\/(?:wa\.me|api\.whatsapp\.com))/i.test(html) || /\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/.test(text),
    address: (jsonLd.contact && /"address"/i.test(html)) || /\b\d{5}-\d{3}\b/.test(text) || /<address\b/i.test(html),
    socialProfiles: hasSocialLinks(html, base),
    openGraph: hasMeta(html, ["og:title"], "property") && hasMeta(html, ["og:description", "og:image"], "property"),
    structuredData: jsonLd.types.length > 0,
    organizationSchema: hasType(/organization|localbusiness|corporation|store|restaurant|clinic|dentist|attorney|legalservice|medicalbusiness|professionalservice/),
    sameAs: jsonLd.sameAs,
    schemaContact: jsonLd.contact,
    contentSchema: hasType(/faqpage|service|product|offer|article|blogposting|breadcrumblist|review|aggregaterating|howto/),
  };
  signals.indexable = signals.indexable && response.status < 400;

  const metrics: SiteAuditResult["metrics"] = {
    wordCount: Math.min(countWords(text), 100_000), rawWordCount: Math.min(rawWordCount, 100_000), h1Count, h2Count, internalLinks,
    imageCount: imageTags.length, imagesWithoutAlt, structuredDataTypes: jsonLd.types,
  };

  let aiPresence: AiPresenceResult | null = null;
  try {
    aiPresence = await checkAiPresence({
      domain: base.hostname.replace(/^www\./, ""),
      title, description, h1: h1Text, text,
      schemaName: jsonLd.name, schemaCity: jsonLd.city,
      siteName: readMeta(html, "og:site_name").trim().slice(0, 80),
    });
  } catch (error) {
    console.warn("[Audit] AI presence check failed:", error instanceof Error ? error.message : error);
  }

  const categories = scoreCategories(signals, aiPresence);
  const findings = makeFindings(signals, metrics, rendering, aiPresence);
  const aiMeasured = categories.some(item => item.key === "aiPresence" && item.measured);
  return {
    id: randomUUID(), domain: base.hostname, analyzedAt: new Date().toISOString(), score: overallScore(categories),
    pageTitle: title || "Título não encontrado", metaDescription: description || "Descrição não encontrada",
    httpStatus: response.status, rendering, metrics, signals, categories, findings, aiPresence,
    limitations: [
      "Analisamos a página inicial do site e os arquivos públicos robots.txt e sitemap.xml. As demais páginas não são percorridas.",
      rendering.usedBrowser
        ? "A página também foi aberta em um navegador para ler o conteúdo que depende de JavaScript."
        : "O conteúdo foi lido diretamente do HTML entregue pelo servidor, como fazem os robôs das IAs.",
      aiMeasured
        ? "As respostas das IAs foram obtidas com busca na web ativada e podem variar conforme o momento, a pergunta e a localização de quem pergunta."
        : "Nesta análise não foi possível consultar as IAs; a nota considera apenas os pontos verificados no site.",
      "A nota não mede posição no Google, tráfego ou volume de menções em outros sites.",
    ],
  };
}

export async function deliverLeadWebhook(payload: {
  name: string; company: string; email: string; whatsapp: string; website: string; wantsConsultation: boolean; auditId: string;
}): Promise<boolean> {
  const endpoint = process.env.LEAD_WEBHOOK_URL?.trim();
  if (!endpoint) return false;
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new AuditError("O endpoint de leads configurado não é uma URL válida.", "WEBHOOK_CONFIG"); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new AuditError("Configure o endpoint de leads com HTTPS e porta padrão.", "WEBHOOK_CONFIG");
  }
  const body = JSON.stringify({ ...payload, submittedAt: new Date().toISOString(), source: "RankIA 360 audit" });
  const response = await fetchPublicText(url, { method: "POST", body, contentType: "application/json", maxBytes: MAX_SMALL_BYTES });
  return response.status >= 200 && response.status < 300;
}
