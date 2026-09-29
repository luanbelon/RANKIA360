import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkAiPresence, type PageContext } from "./ai-presence";

const page: PageContext = {
  domain: "sorrisopleno.com.br",
  title: "Clínica Sorriso Pleno | Dentista em Curitiba",
  description: "Clínica odontológica em Curitiba com implantes e ortodontia.",
  h1: "Seu sorriso em boas mãos",
  text: "A Clínica Sorriso Pleno atende em Curitiba desde 2010.",
  schemaName: "Clínica Sorriso Pleno",
  schemaCity: "Curitiba",
  siteName: "",
};

function reply(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("checkAiPresence", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini");
    vi.stubEnv("PERPLEXITY_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null when no engine is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await checkAiPresence({ ...page, domain: "semchave.com.br" })).toBeNull();
  });

  it("detects recommendations, brand knowledge and competitors per engine", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const prompt: string = body.input ?? body.contents?.[0]?.parts?.[0]?.text ?? "";
      if (prompt.includes("Responda somente com JSON")) {
        return reply({ output_text: '{"marca":"Clínica Sorriso Pleno","segmento":"clínica odontológica","cidade":"Curitiba"}' });
      }
      const isGemini = url.includes("generativelanguage");
      if (prompt.startsWith("Quais são as melhores opções")) {
        const text = isGemini
          ? "1. **OdontoVida** — odontovida.com.br\n2. Instituto Dental Batel — dentalbatel.com.br [1]"
          : "1. Clínica Sorriso Pleno — sorrisopleno.com.br\n2. OdontoVida — odontovida.com.br";
        return isGemini ? reply({ candidates: [{ content: { parts: [{ text }] } }] }) : reply({ output_text: text });
      }
      const text = isGemini ? "NAO_CONHECO" : "A Clínica Sorriso Pleno é uma clínica odontológica em Curitiba especializada em implantes.";
      return isGemini ? reply({ candidates: [{ content: { parts: [{ text }] } }] }) : reply({ output_text: text });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkAiPresence(page);
    expect(result?.recommendationQuestion).toBe("Quais são as melhores opções de clínica odontológica em Curitiba?");
    const chatgpt = result?.engines.find(item => item.engine === "chatgpt");
    const gemini = result?.engines.find(item => item.engine === "gemini");
    const perplexity = result?.engines.find(item => item.engine === "perplexity");
    expect(chatgpt).toMatchObject({ status: "ok", recommended: true, knowsBrand: true });
    expect(gemini).toMatchObject({ status: "ok", recommended: false, knowsBrand: false, recommendations: ["OdontoVida", "Instituto Dental Batel"] });
    expect(perplexity?.status).toBe("not_configured");
  });

  it("marks an engine as error when its API fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 429 })));
    const result = await checkAiPresence({ ...page, domain: "falha.com.br" });
    expect(result?.engines.find(item => item.engine === "chatgpt")?.status).toBe("error");
  });
});
