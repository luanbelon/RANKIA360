import { brand } from "./brand";
import { agencyFaqItems, homeFaqItems, type FaqItem } from "./faq";

type Section = { heading: string; paragraphs?: string[]; items?: string[] };

type SeoPage = {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Section[];
  faq: FaqItem[];
  audience?: string;
};

export const seoPages: Record<string, SeoPage> = {
  "/": {
    path: "/",
    title: "RankIA 360 | Sua empresa aparece no ChatGPT, Gemini e Google?",
    description:
      "Descubra grátis, em menos de 1 minuto, se o Google e IAs como ChatGPT, Gemini e Perplexity entendem e recomendam a sua empresa. SEO, AEO e GEO para empresas.",
    h1: "Sua empresa aparece quando alguém pergunta à IA?",
    intro:
      "Seus clientes já pedem indicações ao ChatGPT, ao Gemini e ao Google. O RankIA 360 mostra em menos de 1 minuto se a sua empresa é entendida e recomendada por eles, com uma análise gratuita baseada apenas em informações públicas do site.",
    sections: [
      {
        heading: "A busca mudou",
        paragraphs: [
          "O Google continua importante, mas cada vez mais gente pergunta direto à inteligência artificial e recebe uma resposta pronta, com poucas empresas indicadas. Se a sua empresa não está entre elas, o cliente nem chega a conhecê-la.",
        ],
      },
      {
        heading: "O que é o AI Visibility Score",
        paragraphs: [
          "O AI Visibility Score é uma nota de 0 a 100 que mostra o quanto o Google e as IAs entendem, confiam e recomendam a sua empresa. Ele analisa 5 pontos:",
        ],
        items: [
          "Saúde técnica do site: se o Google e as IAs conseguem acessar e ler o site, inclusive sem executar JavaScript.",
          "Qualidade do conteúdo: se a página explica com clareza o que a empresa faz e responde às dúvidas dos clientes.",
          "Reconhecimento da marca: se o site mostra quem é a empresa, como falar com ela, onde está e seus perfis oficiais.",
          "Informações para robôs (dados estruturados): se o site descreve a empresa, os contatos e os serviços num formato que as máquinas entendem.",
          "Presença nas IAs: se as IAs conhecem a empresa e a indicam quando um cliente pede uma recomendação.",
        ],
      },
      {
        heading: "Como funciona a análise",
        items: [
          "Você informa o endereço do site.",
          "Lemos as informações públicas do site, como o Google e as IAs fazem.",
          "Calculamos a nota de 0 a 100.",
          "Mostramos o que está atrapalhando e o que corrigir primeiro.",
          "Você recebe um relatório claro, pronto para colocar em prática.",
        ],
      },
      {
        heading: "O que fazemos",
        items: [
          "SEO (Search Engine Optimization): deixar o site rápido, organizado e bem posicionado no Google.",
          "AEO (Answer Engine Optimization): criar conteúdos que respondem diretamente às perguntas dos clientes.",
          "GEO (Generative Engine Optimization): ajudar ChatGPT, Gemini e outras IAs a entender e indicar a empresa.",
          "Autoridade digital: fortalecer a reputação da marca com menções e informações confiáveis.",
        ],
      },
    ],
    faq: homeFaqItems,
  },
  "/agencias": {
    path: "/agencias",
    title: "Parceria White Label de SEO, AEO e GEO para Agências | RankIA 360",
    description:
      "Ofereça SEO, AEO e GEO aos seus clientes com a marca da sua agência. Nós cuidamos da estratégia e da execução nos bastidores, sem você aumentar a equipe.",
    h1: "AI Visibility Score para agências, sem aumentar a equipe",
    intro:
      "Com a parceria white label do AI Visibility Score, sua agência oferece SEO, AEO e GEO aos clientes com a própria marca. Nós cuidamos do diagnóstico, da estratégia e da execução nos bastidores.",
    audience: "Agências de marketing digital",
    sections: [
      {
        heading: "Por que ser parceiro",
        items: [
          "Nova receita recorrente com um serviço que os clientes já estão pedindo.",
          "Sem contratar especialistas: nossa equipe executa a parte técnica.",
          "100% com a sua marca: relatórios e entregas com a identidade da agência.",
          "O cliente continua seu: você mantém o relacionamento, o contrato e o faturamento.",
        ],
      },
      {
        heading: "Como funciona a parceria",
        items: [
          "Sua agência apresenta o AI Visibility Score ao cliente.",
          "Analisamos o site do cliente e entregamos o AI Visibility Score com a marca da agência.",
          "Planejamos e executamos as melhorias de SEO, AEO e GEO nos bastidores.",
          "A agência recebe relatórios prontos para apresentar a evolução ao cliente.",
        ],
      },
    ],
    faq: agencyFaqItems,
  },
};

export function getSeoPage(pathname: string): SeoPage | undefined {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return seoPages[clean];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function buildJsonLd(page: SeoPage, origin: string): string {
  const url = `${origin}${page.path === "/" ? "/" : page.path}`;
  const orgId = `${origin}/#organization`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: brand.name,
      url: `${origin}/`,
      logo: `${origin}/favicon.png`,
      description: brand.description,
      areaServed: { "@type": "Country", name: "Brasil" },
      knowsAbout: ["SEO", "AEO", "GEO", "Answer Engine Optimization", "Generative Engine Optimization", "ChatGPT", "Google AI Overviews", "Dados estruturados"],
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: brand.name,
      url: `${origin}/`,
      inLanguage: "pt-BR",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: "pt-BR",
      isPartOf: { "@id": `${origin}/#website` },
      about: { "@id": orgId },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faq.map(item => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    },
  ];

  if (page.path === "/") {
    graph.push(
      {
        "@type": "Service",
        name: "SEO, AEO e GEO para empresas",
        serviceType: "Otimização para Google e para buscas com inteligência artificial",
        description: "Diagnóstico e execução para empresas serem encontradas e recomendadas no Google e em IAs como ChatGPT, Gemini e Perplexity.",
        provider: { "@id": orgId },
        areaServed: { "@type": "Country", name: "Brasil" },
        audience: { "@type": "BusinessAudience", name: "Empresas" },
      },
      {
        "@type": "SoftwareApplication",
        name: "AI Visibility Score",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Nota de 0 a 100 que mostra o quanto o Google e as IAs entendem, confiam e recomendam uma empresa.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        provider: { "@id": orgId },
      },
    );
  } else {
    graph.push(
      {
        "@type": "Service",
        name: "Parceria white label de SEO, AEO e GEO",
        serviceType: "White label do AI Visibility Score para agências",
        description: page.description,
        provider: { "@id": orgId },
        areaServed: { "@type": "Country", name: "Brasil" },
        audience: { "@type": "BusinessAudience", name: page.audience },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Para agências", item: url },
        ],
      },
    );
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export function renderSeoHead(page: SeoPage, origin: string): string {
  const url = `${origin}${page.path === "/" ? "/" : page.path}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<link rel="alternate" hreflang="pt-BR" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${escapeHtml(brand.name)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<script type="application/ld+json">${buildJsonLd(page, origin)}</script>`,
  ].join("\n    ");
}

export function renderSeoBody(page: SeoPage): string {
  const sections = page.sections
    .map(section => {
      const paragraphs = (section.paragraphs ?? []).map(p => `<p>${escapeHtml(p)}</p>`).join("");
      const items = section.items?.length ? `<ul>${section.items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "";
      return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${items}</section>`;
    })
    .join("");
  const faq = page.faq.map(item => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join("");
  return `<div class="seo-fallback"><header><a href="/">${escapeHtml(brand.name)}</a> · <a href="/agencias">Para agências</a></header><main><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.intro)}</p>${sections}<section><h2>Perguntas frequentes</h2>${faq}</section></main></div>`;
}

export function renderLlmsTxt(origin: string): string {
  const home = seoPages["/"];
  const agency = seoPages["/agencias"];
  const lines = [
    `# ${brand.name}`,
    "",
    `> ${brand.description}`,
    "",
    home.intro,
    "",
    "## Páginas",
    "",
    `- [Início](${origin}/): ${home.description}`,
    `- [Para agências](${origin}/agencias): ${agency.description}`,
    "",
    ...home.sections.flatMap(section => [
      `## ${section.heading}`,
      "",
      ...(section.paragraphs ?? []),
      ...(section.items ?? []).map(item => `- ${item}`),
      "",
    ]),
    "## Perguntas frequentes",
    "",
    ...home.faq.flatMap(item => [`### ${item.q}`, "", item.a, ""]),
  ];
  return lines.join("\n");
}
