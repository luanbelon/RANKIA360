import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminConfigured, adminLogin, adminLogout, hasAdminSession } from "./admin-auth";
import { listCaptures, recordAudit, recordLead } from "./services/capture-store";
import { analyzePublicSite, AuditError, deliverLeadWebhook } from "./services/site-audit";

const leadInput = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  whatsapp: z.string().trim().max(32).default(""),
  website: z.string().trim().min(3).max(253),
  wantsConsultation: z.boolean().default(false),
  auditId: z.string().uuid(),
  draftId: z.string().uuid().optional(),
});

const leadDraftInput = z.object({
  draftId: z.string().uuid(),
  auditId: z.string().uuid(),
  website: z.string().trim().min(3).max(253),
  name: z.string().trim().max(100).default(""),
  company: z.string().trim().max(120).default(""),
  email: z.string().trim().max(254).default(""),
  whatsapp: z.string().trim().max(32).default(""),
  wantsConsultation: z.boolean().default(false),
});

const auditWindow = new Map<string, { startsAt: number; count: number }>();
const leadWindow = new Map<string, { startsAt: number; count: number }>();
const draftWindow = new Map<string, { startsAt: number; count: number }>();

function allowDraft(key: string): boolean {
  const now = Date.now();
  const existing = draftWindow.get(key);
  if (!existing || now - existing.startsAt > 15 * 60_000) {
    if (draftWindow.size > 5_000) {
      for (const [entry, value] of Array.from(draftWindow.entries())) if (now - value.startsAt > 15 * 60_000) draftWindow.delete(entry);
    }
    draftWindow.set(key, { startsAt: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= 120;
}
function enforceAuditLimit(key: string) {
  const now = Date.now();
  const existing = auditWindow.get(key);
  if (!existing || now - existing.startsAt > 60_000) {
    auditWindow.set(key, { startsAt: now, count: 1 });
    if (auditWindow.size > 2_000) {
      for (const [entry, value] of Array.from(auditWindow.entries())) if (now - value.startsAt > 60_000) auditWindow.delete(entry);
    }
    if (auditWindow.size > 5_000) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "O serviço está ocupado. Tente novamente em instantes." });
    return;
  }
  if (existing.count >= 6) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas análises em pouco tempo. Aguarde um minuto e tente novamente." });
  existing.count += 1;
}

function enforceLeadLimit(key: string) {
  const now = Date.now();
  const windowMs = 15 * 60_000;
  const existing = leadWindow.get(key);
  if (!existing || now - existing.startsAt > windowMs) {
    if (leadWindow.size > 2_000) {
      for (const [entry, value] of Array.from(leadWindow.entries())) if (now - value.startsAt > windowMs) leadWindow.delete(entry);
    }
    if (leadWindow.size > 5_000) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "O serviço está ocupado. Tente novamente em instantes." });
    leadWindow.set(key, { startsAt: now, count: 1 });
    return;
  }
  if (existing.count >= 4) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Limite de envios atingido. Tente novamente mais tarde." });
  existing.count += 1;
}

const panelProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!hasAdminSession(ctx.req)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sua sessão expirou. Entre novamente." });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  admin: router({
    session: publicProcedure.query(({ ctx }) => ({ configured: adminConfigured(), authenticated: hasAdminSession(ctx.req) })),
    login: publicProcedure
      .input(z.object({ user: z.string().max(100), password: z.string().max(200) }))
      .mutation(({ ctx, input }) => {
        const result = adminLogin(ctx.req, ctx.res, input.user, input.password);
        if (result.ok) return { ok: true } as const;
        const message = result.reason === "not_configured"
          ? "O acesso ao painel ainda não foi configurado no servidor."
          : result.reason === "locked"
            ? "Muitas tentativas. Aguarde 15 minutos e tente de novo."
            : "Usuário ou senha incorretos.";
        throw new TRPCError({ code: result.reason === "locked" ? "TOO_MANY_REQUESTS" : "BAD_REQUEST", message });
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      adminLogout(ctx.req, ctx.res);
      return { ok: true } as const;
    }),
    data: panelProcedure.query(async () => {
      try {
        return await listCaptures();
      } catch (error) {
        console.error("[Admin] Falha ao ler os dados", error instanceof Error ? error.message : error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível ler os dados agora. Confira a conexão com o banco." });
      }
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  audit: router({
    analyze: publicProcedure.input(z.object({ domain: z.string().trim().min(3).max(253) })).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      enforceAuditLimit(ip);
      try {
        const result = await analyzePublicSite(input.domain);
        void recordAudit({ domain: result.domain, status: "ok", auditId: result.id, score: result.score, ip });
        return result;
      } catch (error) {
        void recordAudit({ domain: input.domain, status: "error", errorMessage: error instanceof Error ? error.message : String(error), ip });
        if (error instanceof TRPCError) throw error;
        if (error instanceof AuditError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message, cause: error });
        }
        console.error("[Audit] Unexpected analysis failure", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a análise agora. Confira o domínio e tente novamente." });
      }
    }),
    saveLeadDraft: publicProcedure.input(leadDraftInput).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      if (!allowDraft(ip)) return { saved: false };
      if (!input.name && !input.company && !input.email && !input.whatsapp) return { saved: false };
      await recordLead({
        draftId: input.draftId, auditId: input.auditId, domain: input.website,
        name: input.name, company: input.company, email: input.email, whatsapp: input.whatsapp,
        wantsConsultation: input.wantsConsultation, submitted: false, ip,
      });
      return { saved: true };
    }),
    submitLead: publicProcedure.input(leadInput).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      enforceLeadLimit(ip);
      await recordLead({
        draftId: input.draftId ?? crypto.randomUUID(), auditId: input.auditId, domain: input.website,
        name: input.name, company: input.company, email: input.email, whatsapp: input.whatsapp,
        wantsConsultation: input.wantsConsultation, submitted: true, ip,
      });
      try {
        const received = await deliverLeadWebhook(input);
        if (!received) console.warn("[Lead] LEAD_WEBHOOK_URL is not configured; the lead was not delivered.");
        return {
          received,
          reportUnlocked: true,
          message: input.wantsConsultation && received
            ? "Pronto! O relatório completo foi liberado abaixo e um especialista vai entrar em contato."
            : "Pronto! O relatório completo foi liberado abaixo.",
        };
      } catch (error) {
        console.error("[Lead] Webhook delivery failed", error instanceof Error ? error.message : error);
        return {
          received: false,
          reportUnlocked: true,
          message: "Pronto! O relatório completo foi liberado abaixo.",
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
