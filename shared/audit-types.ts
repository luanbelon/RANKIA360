export type AuditCategoryKey = "technical" | "content" | "entity" | "structuredData" | "aiPresence";

export type AuditCategory = {
  key: AuditCategoryKey;
  label: string;
  score: number;
  /** False when the category could not be measured (e.g. no AI provider configured); excluded from the overall score. */
  measured: boolean;
  status: string;
  explanation: string;
};

export type AuditFinding = {
  id: string;
  priority: "high" | "opportunity" | "good";
  title: string;
  description: string;
  category: string;
};

export type AiEngine = "chatgpt" | "gemini" | "perplexity";

export type AiEngineCheck = {
  engine: AiEngine;
  label: string;
  status: "ok" | "error" | "not_configured";
  knowsBrand: boolean;
  recommended: boolean;
  brandAnswer: string;
  recommendations: string[];
};

export type AiPresenceResult = {
  profile: { brandName: string; category: string; city: string };
  brandQuestion: string;
  recommendationQuestion: string;
  engines: AiEngineCheck[];
};

export type SiteAuditResult = {
  id: string;
  domain: string;
  analyzedAt: string;
  score: number;
  pageTitle: string;
  metaDescription: string;
  httpStatus: number;
  rendering: {
    /** The page was also opened in a headless browser because the raw HTML had little content. */
    usedBrowser: boolean;
    /** The main content only appears after JavaScript runs. */
    jsDependent: boolean;
  };
  metrics: {
    wordCount: number;
    rawWordCount: number;
    h1Count: number;
    h2Count: number;
    internalLinks: number;
    imageCount: number;
    imagesWithoutAlt: number;
    structuredDataTypes: string[];
  };
  signals: {
    https: boolean;
    indexable: boolean;
    robotsTxt: boolean;
    sitemap: boolean;
    canonical: boolean;
    mobileViewport: boolean;
    visibleWithoutJs: boolean;
    title: boolean;
    metaDescription: boolean;
    singleH1: boolean;
    enoughText: boolean;
    subheadings: boolean;
    internalLinking: boolean;
    answersQuestions: boolean;
    aboutPage: boolean;
    contactPage: boolean;
    contactInfo: boolean;
    address: boolean;
    socialProfiles: boolean;
    openGraph: boolean;
    structuredData: boolean;
    organizationSchema: boolean;
    sameAs: boolean;
    schemaContact: boolean;
    contentSchema: boolean;
  };
  categories: AuditCategory[];
  findings: AuditFinding[];
  aiPresence: AiPresenceResult | null;
  limitations: string[];
};

export type LeadPayload = {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  website: string;
  wantsConsultation: boolean;
  auditId: string;
};
