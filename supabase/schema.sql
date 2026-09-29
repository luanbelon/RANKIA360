-- Rode uma vez no Supabase: SQL Editor > New query > cole este arquivo > Run.

CREATE TABLE IF NOT EXISTS site_audits (
  id BIGSERIAL PRIMARY KEY,
  domain VARCHAR(253) NOT NULL,
  status VARCHAR(10) NOT NULL,
  audit_id UUID NULL,
  score INT NULL,
  error_message VARCHAR(300) NULL,
  ip_hash VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_audits_created ON site_audits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_audits_domain ON site_audits (domain);

CREATE TABLE IF NOT EXISTS lead_forms (
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
);
CREATE INDEX IF NOT EXISTS idx_lead_forms_created ON lead_forms (created_at DESC);

-- Só o servidor (com a chave secreta) grava e lê; a chave pública não acessa nada.
ALTER TABLE site_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
