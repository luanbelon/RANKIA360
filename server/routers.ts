import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzePublicSite, AuditError, deliverLeadWebhook } from "./services/site-audit";

const leadInput = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  whatsapp: z.string().trim().max(32).default(""),
  website: z.string().trim().min(3).max(253),
  wantsConsultation: z.boolean().default(false),
  auditId: z.string().uuid(),
});

const auditWindow = new Map<string, { startsAt: number; count: number }>();
const leadWindow = new Map<string, { startsAt: number; count: number }>();
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

export const appRouter = router({
  system: systemRouter,
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
        return await analyzePublicSite(input.domain);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof AuditError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message, cause: error });
        }
        console.error("[Audit] Unexpected analysis failure", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a análise agora. Confira o domínio e tente novamente." });
      }
    }),
    submitLead: publicProcedure.input(leadInput).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      enforceLeadLimit(ip);
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
