import type { AiEngine, AiEngineCheck, AiPresenceResult } from "../../shared/audit-types";

const CALL_TIMEOUT_MS = 40_000;
const PROFILE_TIMEOUT_MS = 30_000;
const CACHE_TTL_MS = 12 * 60 * 60_000;
const NOT_KNOWN = "NAO_CONHECO";

type EngineConfig = { engine: AiEngine; label: string; apiKey: string; model: string };
type AskOptions = { search: boolean; timeoutMs?: number };

export type PageContext = {
  domain: string;
  title: string;
  description: string;
  h1: string;
  text: string;
  schemaName: string;
  schemaCity: string;
  siteName: string;
};

const cache = new Map<string, { at: number; result: AiPresenceResult }>();

function engines(): EngineConfig[] {
  return [
    { engine: "chatgpt", label: "ChatGPT", apiKey: process.env.OPENAI_API_KEY?.trim() ?? "", model: process.env.OPENAI_MODEL?.trim() || "gpt-5.5" },
    { engine: "gemini", label: "Gemini", apiKey: process.env.GEMINI_API_KEY?.trim() ?? "", model: process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest" },
    { engine: "perplexity", label: "Perplexity", apiKey: process.env.PERPLEXITY_API_KEY?.trim() ?? "", model: process.env.PERPLEXITY_MODEL?.trim() || "sonar" },
  ];
}

export function hasAiEngines(): boolean {
  return engines().some(item => item.apiKey);
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`${response.status} ${detail}`);
  }
  return response.json();
}

const GEMINI_FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
// Free-tier keys have no Google Search grounding quota (429); remember it to avoid wasting calls.
let geminiSearchBlockedUntil = 0;

const statusOf = (error: unknown) => Number(String((error as Error)?.message ?? "").slice(0, 3));

async function askGemini(config: EngineConfig, prompt: string, search: boolean, timeoutMs: number): Promise<string> {
  const models = Array.from(new Set([config.model, ...GEMINI_FALLBACK_MODELS]));
  let lastError: unknown;
  for (const model of models) {
    let useSearch = search && Date.now() >= geminiSearchBlockedUntil;
    let retriedBusy = false;
    for (;;) {
      try {
        const data = await postJson(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          { "x-goog-api-key": config.apiKey },
          { contents: [{ parts: [{ text: prompt }] }], ...(useSearch ? { tools: [{ google_search: {} }] } : {}) },
          timeoutMs,
        );
        return (data.candidates?.[0]?.content?.parts ?? []).map((part: any) => part.text ?? "").join("");
      } catch (error) {
        lastError = error;
        if (useSearch && statusOf(error) === 429) {
          geminiSearchBlockedUntil = Date.now() + 60 * 60_000;
          useSearch = false;
          continue;
        }
        if (!retriedBusy && statusOf(error) === 503) {
          retriedBusy = true;
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        break;
      }
    }
    if (![404, 429, 500, 503].includes(statusOf(lastError))) break;
  }
  throw lastError;
}

async function ask(config: EngineConfig, prompt: string, options: AskOptions): Promise<string> {
  const timeoutMs = options.timeoutMs ?? CALL_TIMEOUT_MS;
  if (config.engine === "chatgpt") {
    const data = await postJson("https://api.openai.com/v1/responses", { authorization: `Bearer ${config.apiKey}` }, {
      model: config.model,
      input: prompt,
      ...(options.search ? { tools: [{ type: "web_search" }] } : {}),
    }, timeoutMs);
    if (typeof data.output_text === "string") return data.output_text;
    return (data.output ?? [])
      .filter((item: any) => item.type === "message")
      .flatMap((item: any) => item.content ?? [])
      .filter((part: any) => part.type === "output_text")
      .map((part: any) => part.text)
      .join("\n");
  }
  if (config.engine === "gemini") return askGemini(config, prompt, options.search, timeoutMs);
  const data = await postJson("https://api.perplexity.ai/chat/completions", { authorization: `Bearer ${config.apiKey}` }, {
    model: config.model,
    messages: [{ role: "user", content: prompt }],
  }, timeoutMs);
  return data.choices?.[0]?.message?.content ?? "";
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const compact = (value: string) => normalize(value).replace(/\s+/g, "");

function domainLabel(domain: string): string {
  return domain.replace(/^www\./, "").split(".")[0] ?? domain;
}

function mentionsCompany(text: string, domain: string, brandName: string): boolean {
  const haystack = compact(text);
  const needles = [compact(domainLabel(domain)), compact(brandName)].filter(needle => needle.length >= 4);
  return needles.some(needle => haystack.includes(needle)) || text.toLowerCase().includes(domain.replace(/^www\./, ""));
}

function cleanLine(value: string): string {
  return value
    .replace(/\[(\d+)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .split(/\s[—–-]\s|:\s|\s\(/)[0]!
    .trim()
    .slice(0, 70);
}

function extractRecommendations(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:\d+[.)]|[-*•])\s+(.+)/);
    if (!match) continue;
    const name = cleanLine(match[1] ?? "");
    if (name.length >= 2 && !names.includes(name)) names.push(name);
    if (names.length >= 6) break;
  }
  return names;
}

function heuristicProfile(page: PageContext): AiPresenceResult["profile"] {
  const fromTitle = page.title.split(/\s[|–—-]\s|:\s/)[0]?.trim() ?? "";
  return {
    brandName: page.siteName || page.schemaName || fromTitle || domainLabel(page.domain),
    category: "",
    city: page.schemaCity,
  };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { return null; }
}

async function buildProfile(page: PageContext, available: EngineConfig[]): Promise<AiPresenceResult["profile"]> {
  const fallback = heuristicProfile(page);
  const prompt = [
    "Com base nas informações abaixo sobre o site de uma empresa, identifique:",
    "- marca: o nome comercial da empresa;",
    "- segmento: como um cliente descreveria o que ela oferece ao pedir uma indicação (ex.: \"escritório de advocacia trabalhista\", \"clínica odontológica\", \"software de gestão para restaurantes\");",
    "- cidade: a cidade onde atende, ou vazio se atua em todo o país ou online.",
    "Responda somente com JSON no formato {\"marca\":\"\",\"segmento\":\"\",\"cidade\":\"\"}.",
    "",
    `Domínio: ${page.domain}`,
    `Título: ${page.title}`,
    `Descrição: ${page.description}`,
    `Título principal: ${page.h1}`,
    page.schemaName ? `Nome nos dados estruturados: ${page.schemaName}` : "",
    page.schemaCity ? `Cidade nos dados estruturados: ${page.schemaCity}` : "",
    `Texto da página: ${page.text.slice(0, 1800)}`,
  ].filter(Boolean).join("\n");
  const preferred = [...available].sort((a, b) => (a.engine === "perplexity" ? 1 : 0) - (b.engine === "perplexity" ? 1 : 0));
  for (const config of preferred) {
    try {
      const parsed = parseJsonObject(await ask(config, prompt, { search: false, timeoutMs: PROFILE_TIMEOUT_MS }));
      if (!parsed) continue;
      const text = (key: string) => (typeof parsed[key] === "string" ? (parsed[key] as string).trim().slice(0, 80) : "");
      return {
        brandName: text("marca") || fallback.brandName,
        category: text("segmento"),
        city: text("cidade") || fallback.city,
      };
    } catch (error) {
      console.warn(`[AI presence] Profile extraction failed on ${config.label}:`, error instanceof Error ? error.message : error);
    }
  }
  return fallback;
}

async function checkEngine(config: EngineConfig, domain: string, profile: AiPresenceResult["profile"], brandPrompt: string, recommendationPrompt: string): Promise<AiEngineCheck> {
  const base: AiEngineCheck = { engine: config.engine, label: config.label, status: "ok", knowsBrand: false, recommended: false, brandAnswer: "", recommendations: [] };
  const [brandResult, recommendationResult] = await Promise.allSettled([
    ask(config, brandPrompt, { search: true }),
    recommendationPrompt ? ask(config, recommendationPrompt, { search: true }) : Promise.resolve(""),
  ]);
  if (brandResult.status === "rejected" && (recommendationResult.status === "rejected" || !recommendationPrompt)) {
    console.warn(`[AI presence] ${config.label} failed:`, brandResult.reason instanceof Error ? brandResult.reason.message : brandResult.reason);
    return { ...base, status: "error" };
  }
  if (brandResult.status === "fulfilled") {
    const answer = brandResult.value.replace(/\[(\d+)\]/g, "").trim();
    const unknown = answer.includes(NOT_KNOWN) || /^(?:nao|não) (?:conheco|conheço|encontrei)/i.test(answer);
    base.knowsBrand = !unknown && answer.length > 30;
    base.brandAnswer = base.knowsBrand ? answer.slice(0, 480) : "";
  }
  if (recommendationResult.status === "fulfilled" && recommendationResult.value) {
    base.recommended = mentionsCompany(recommendationResult.value, domain, profile.brandName);
    base.recommendations = extractRecommendations(recommendationResult.value);
  }
  return base;
}

/**
 * Asks each configured AI engine (with live web search) whether it knows the company and
 * whether it recommends it for a neutral, customer-style question. Returns null when no engine
 * is configured.
 */
export async function checkAiPresence(page: PageContext): Promise<AiPresenceResult | null> {
  const all = engines();
  const available = all.filter(item => item.apiKey);
  if (!available.length) return null;

  const cached = cache.get(page.domain);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const profile = await buildProfile(page, available);
  const where = profile.city ? ` em ${profile.city}` : " no Brasil";
  const brandQuestion = `O que você sabe sobre a empresa ${profile.brandName}${profile.city ? `, de ${profile.city}` : ""}?`;
  const recommendationQuestion = profile.category ? `Quais são as melhores opções de ${profile.category}${where}?` : "";
  const brandPrompt = `${brandQuestion} O site dela é ${page.domain}. Responda em português, em no máximo 3 frases, dizendo o que ela faz e onde atua. Se não encontrar informações confiáveis sobre essa empresa, responda apenas: ${NOT_KNOWN}`;
  const recommendationPrompt = recommendationQuestion
    ? `${recommendationQuestion} Indique até 5 empresas em uma lista numerada, uma por linha, no formato: Nome da empresa — site. Responda em português.`
    : "";

  const checks = await Promise.all(all.map(config => config.apiKey
    ? checkEngine(config, page.domain, profile, brandPrompt, recommendationPrompt)
    : Promise.resolve<AiEngineCheck>({ engine: config.engine, label: config.label, status: "not_configured", knowsBrand: false, recommended: false, brandAnswer: "", recommendations: [] })));

  const result: AiPresenceResult = { profile, brandQuestion, recommendationQuestion, engines: checks };
  if (recommendationQuestion && checks.some(item => item.status === "ok")) {
    cache.set(page.domain, { at: Date.now(), result });
    if (cache.size > 500) {
      for (const [key, value] of Array.from(cache.entries())) if (Date.now() - value.at > CACHE_TTL_MS) cache.delete(key);
    }
  }
  return result;
}
