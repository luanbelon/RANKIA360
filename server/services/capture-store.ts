import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

export type AuditRecord = {
  domain: string;
  status: "ok" | "error";
  auditId?: string;
  score?: number;
  errorMessage?: string;
  ip: string;
};

export type LeadRecord = {
  draftId: string;
  auditId: string;
  domain: string;
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  wantsConsultation: boolean;
  submitted: boolean;
  ip: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");

let sql: postgres.Sql | null = null;
let ready: Promise<boolean> | null = null;

// IPs are stored hashed: enough to spot repeat visitors without keeping the raw address.
function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "rankia360"}:${ip}`).digest("hex").slice(0, 32);
}

function supabaseRest(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_API_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

async function rest(pathAndQuery: string, init: { method: string; body?: unknown; prefer?: string }): Promise<Response> {
  const config = supabaseRest()!;
  const response = await fetch(`${config.url}/rest/v1/${pathAndQuery}`, {
    method: init.method,
    headers: {
      apikey: config.key,
      "content-type": "application/json",
      ...(init.prefer ? { prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Supabase ${response.status}: ${(await response.text().catch(() => "")).slice(0, 200)}`);
  }
  return response;
}

function database(): Promise<boolean> {
  if (ready) return ready;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (!supabaseRest()) console.warn("[Capture] Banco não configurado; salvando em data/*.jsonl.");
    ready = Promise.resolve(false);
    return ready;
  }
  ready = (async () => {
    try {
      const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
      // Supabase's pooler (transaction mode) does not support prepared statements.
      sql = postgres(url, { max: 4, prepare: false, ssl: local ? false : "require", idle_timeout: 30, onnotice: () => undefined });
      await sql`CREATE TABLE IF NOT EXISTS site_audits (
        id BIGSERIAL PRIMARY KEY,
        domain VARCHAR(253) NOT NULL,
        status VARCHAR(10) NOT NULL,
        audit_id UUID NULL,
        score INT NULL,
        error_message VARCHAR(300) NULL,
        ip_hash VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_site_audits_created ON site_audits (created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_site_audits_domain ON site_audits (domain)`;
      await sql`CREATE TABLE IF NOT EXISTS lead_forms (
        id BIGSERIAL PRIMARY KEY,
        draft_id UUID NOT NULL UNIQUE,
        audit_id UUID NOT NULL,
        domain VARCHAR(253) NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        company VARCHAR(120) NOT NULL DEFAULT '',
        email VARCHAR(254) NOT NULL DEFAULT '',
        whatsapp VARCHAR(32) NOT NULL DEFAULT '',
        wants_consultation BOOLEAN NOT NULL DEFAULT false,
        submitted BOOLEAN NOT NULL DEFAULT false,
        ip_hash VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_lead_forms_created ON lead_forms (created_at DESC)`;
      // Only the server writes here; RLS without policies keeps Supabase's public API from reading it.
      await sql`ALTER TABLE site_audits ENABLE ROW LEVEL SECURITY`;
      await sql`ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY`;
      return true;
    } catch (error) {
      console.error("[Capture] Não foi possível preparar o banco; salvando em data/*.jsonl.", error instanceof Error ? error.message : error);
      await sql?.end({ timeout: 1 }).catch(() => undefined);
      sql = null;
      return false;
    }
  })();
  return ready;
}

async function appendLocal(file: string, row: Record<string, unknown>) {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(path.join(DATA_DIR, file), `${JSON.stringify({ ...row, at: new Date().toISOString() })}\n`, "utf8");
}

export async function recordAudit(record: AuditRecord): Promise<void> {
  const row = {
    domain: record.domain.slice(0, 253),
    status: record.status,
    auditId: record.auditId ?? null,
    score: record.score ?? null,
    errorMessage: record.errorMessage?.slice(0, 300) ?? null,
    ipHash: hashIp(record.ip),
  };
  try {
    if (await database() && sql) {
      await sql`INSERT INTO site_audits (domain, status, audit_id, score, error_message, ip_hash)
        VALUES (${row.domain}, ${row.status}, ${row.auditId}, ${row.score}, ${row.errorMessage}, ${row.ipHash})`;
      return;
    }
    if (supabaseRest()) {
      await rest("site_audits", {
        method: "POST",
        prefer: "return=minimal",
        body: { domain: row.domain, status: row.status, audit_id: row.auditId, score: row.score, error_message: row.errorMessage, ip_hash: row.ipHash },
      });
      return;
    }
    await appendLocal("site-audits.jsonl", row);
  } catch (error) {
    console.error("[Capture] Falha ao salvar análise:", error instanceof Error ? error.message : error);
  }
}

export async function recordLead(record: LeadRecord): Promise<void> {
  const { ip, ...fields } = record;
  const ipHash = hashIp(ip);
  try {
    if (await database() && sql) {
      // A draft never downgrades a lead that was already submitted.
      await sql`INSERT INTO lead_forms (draft_id, audit_id, domain, name, company, email, whatsapp, wants_consultation, submitted, ip_hash)
        VALUES (${fields.draftId}, ${fields.auditId}, ${fields.domain.slice(0, 253)}, ${fields.name}, ${fields.company}, ${fields.email},
          ${fields.whatsapp}, ${fields.wantsConsultation}, ${fields.submitted}, ${ipHash})
        ON CONFLICT (draft_id) DO UPDATE SET
          name = EXCLUDED.name, company = EXCLUDED.company, email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp,
          wants_consultation = EXCLUDED.wants_consultation,
          submitted = lead_forms.submitted OR EXCLUDED.submitted,
          updated_at = now()`;
      return;
    }
    if (supabaseRest()) {
      const body = {
        draft_id: fields.draftId, audit_id: fields.auditId, domain: fields.domain.slice(0, 253),
        name: fields.name, company: fields.company, email: fields.email, whatsapp: fields.whatsapp,
        wants_consultation: fields.wantsConsultation, submitted: fields.submitted, ip_hash: ipHash,
        updated_at: new Date().toISOString(),
      };
      if (fields.submitted) {
        await rest("lead_forms?on_conflict=draft_id", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body });
        return;
      }
      // A late draft must not overwrite a form that was already submitted.
      const { submitted: _submitted, draft_id: _draftId, ...changes } = body;
      const updated = await rest(`lead_forms?draft_id=eq.${encodeURIComponent(fields.draftId)}&submitted=eq.false`, {
        method: "PATCH", prefer: "return=representation", body: changes,
      });
      const rows = (await updated.json().catch(() => [])) as unknown[];
      if (!rows.length) await rest("lead_forms?on_conflict=draft_id", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body });
      return;
    }
    await appendLocal("lead-forms.jsonl", { ...fields, ipHash });
  } catch (error) {
    console.error("[Capture] Falha ao salvar formulário:", error instanceof Error ? error.message : error);
  }
}
