import { brand } from "@shared/brand";
import { listCaptures, type StoredLead } from "./capture-store";

// Brasília has had no daylight saving time since 2019, so 08:00 there is always 11:00 UTC.
const BRASILIA_OFFSET_HOURS = -3;
const REPORT_HOUR = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CONTACTS = 10;

export function dailyReportConfigured(): boolean {
  return Boolean(process.env.REPORT_WHATSAPP_PHONE && process.env.CALLMEBOT_API_KEY);
}

/** Start of the Brasília calendar day containing `at`, `daysBack` days earlier, as a UTC timestamp. */
function brasiliaDayStart(at: number, daysBack = 0): number {
  const offsetMs = BRASILIA_OFFSET_HOURS * 60 * 60 * 1000;
  const local = at + offsetMs;
  return local - (local % DAY_MS) - offsetMs - daysBack * DAY_MS;
}

function formatDay(start: number): string {
  const local = new Date(start + BRASILIA_OFFSET_HOURS * 60 * 60 * 1000);
  return `${String(local.getUTCDate()).padStart(2, "0")}/${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

function describeLead(lead: StoredLead): string {
  const who = [lead.name, lead.company].filter(Boolean).join(" - ") || "Sem nome";
  const contact = [lead.whatsapp, lead.email].filter(Boolean).join(" | ") || "sem contato";
  const status = lead.submitted ? "enviado" : "não enviado";
  const talk = lead.wantsConsultation ? ", quer conversar" : "";
  return `- ${who} (${lead.domain || "sem site"})\n  ${contact} [${status}${talk}]`;
}

export async function buildDailyReport(scope: "yesterday" | "today", now = Date.now()): Promise<string> {
  const start = brasiliaDayStart(now, scope === "yesterday" ? 1 : 0);
  const end = scope === "yesterday" ? start + DAY_MS : now;
  const inRange = (iso: string) => {
    const time = Date.parse(iso);
    return time >= start && time < end;
  };

  const snapshot = await listCaptures();
  const audits = snapshot.audits.filter(audit => inRange(audit.createdAt));
  const leads = snapshot.leads.filter(lead => inRange(lead.updatedAt || lead.createdAt));
  const submitted = leads.filter(lead => lead.submitted).length;
  const consultation = leads.filter(lead => lead.wantsConsultation).length;
  const distinctSites = new Set(audits.map(audit => audit.domain)).size;

  const title = scope === "yesterday" ? `resumo de ${formatDay(start)}` : `parcial de hoje (${formatDay(start)})`;
  const lines = [
    `*${brand.name} - ${title}*`,
    "",
    `Sites analisados: ${audits.length} (${distinctSites} diferentes)`,
    `Formulários iniciados: ${leads.length}`,
    `Enviados: ${submitted}`,
    `Não enviados: ${leads.length - submitted}`,
    `Querem conversar: ${consultation}`,
  ];

  if (leads.length) {
    const ordered = [...leads].sort((a, b) => Number(b.wantsConsultation) - Number(a.wantsConsultation) || Number(b.submitted) - Number(a.submitted));
    lines.push("", "*Contatos*", ...ordered.slice(0, MAX_CONTACTS).map(describeLead));
    if (leads.length > MAX_CONTACTS) lines.push(`...e mais ${leads.length - MAX_CONTACTS} no painel.`);
  }

  const publicUrl = (process.env.PUBLIC_URL || brand.siteUrl).replace(/\/$/, "");
  if (publicUrl) lines.push("", `Painel: ${publicUrl}/admin`);
  return lines.join("\n");
}

export async function sendWhatsApp(text: string): Promise<void> {
  const phone = process.env.REPORT_WHATSAPP_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (!phone || !apiKey) throw new Error("WhatsApp não configurado: defina REPORT_WHATSAPP_PHONE e CALLMEBOT_API_KEY.");

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const body = await response.text();
  // CallMeBot answers 200 with an HTML page even for some failures, so the body has to be checked too.
  if (!response.ok || /error|invalid|not active/i.test(body)) {
    throw new Error(`CallMeBot recusou o envio (HTTP ${response.status}).`);
  }
}

export async function sendDailyReport(scope: "yesterday" | "today"): Promise<void> {
  await sendWhatsApp(await buildDailyReport(scope));
}

function msUntilNextReport(now = Date.now()): number {
  const todayRun = brasiliaDayStart(now) + REPORT_HOUR * 60 * 60 * 1000;
  return (todayRun > now ? todayRun : todayRun + DAY_MS) - now;
}

export function scheduleDailyReport(): void {
  if (!dailyReportConfigured()) {
    console.log("[daily-report] WhatsApp não configurado; relatório diário desligado.");
    return;
  }

  const planNext = () => {
    const timer = setTimeout(async () => {
      try {
        await sendDailyReport("yesterday");
        console.log("[daily-report] Relatório enviado.");
      } catch (error) {
        console.error("[daily-report] Falha ao enviar:", error instanceof Error ? error.message : error);
      }
      planNext();
    }, msUntilNextReport());
    timer.unref();
  };

  planNext();
  console.log(`[daily-report] Próximo envio em ${Math.round(msUntilNextReport() / 60000)} min.`);
}
