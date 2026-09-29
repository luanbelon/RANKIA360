import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";

const COOKIE = "rankia_admin";
const SESSION_MS = 12 * 60 * 60_000;
const attempts = new Map<string, { startsAt: number; count: number }>();

function credentials(): { user: string; password: string } | null {
  const user = process.env.ADMIN_USER?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  return user && password ? { user, password } : null;
}

// Changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) invalidates every open session.
function secret(password: string): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || createHash("sha256").update(`rankia360-admin:${password}`).digest("hex");
}

function sameText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function isSecure(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwarded = String(req.headers["x-forwarded-proto"] ?? "");
  return forwarded.split(",").some(proto => proto.trim().toLowerCase() === "https");
}

export function adminConfigured(): boolean {
  return credentials() !== null;
}

export function hasAdminSession(req: Request): boolean {
  const config = credentials();
  if (!config) return false;
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE];
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return sameText(signature, sign(`${config.user}:${expires}`, secret(config.password)));
}

export type LoginResult = { ok: true } | { ok: false; reason: "not_configured" | "invalid" | "locked" };

export function adminLogin(req: Request, res: Response, user: string, password: string): LoginResult {
  const config = credentials();
  if (!config) return { ok: false, reason: "not_configured" };

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now - entry.startsAt < 15 * 60_000 && entry.count >= 5) return { ok: false, reason: "locked" };

  const valid = sameText(user.trim(), config.user) && sameText(password, config.password);
  if (!valid) {
    if (!entry || now - entry.startsAt >= 15 * 60_000) attempts.set(ip, { startsAt: now, count: 1 });
    else entry.count += 1;
    if (attempts.size > 5_000) attempts.clear();
    return { ok: false, reason: "invalid" };
  }

  attempts.delete(ip);
  const expires = String(now + SESSION_MS);
  res.cookie(COOKIE, `${expires}.${sign(`${config.user}:${expires}`, secret(config.password))}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecure(req),
    path: "/",
    maxAge: SESSION_MS,
  });
  return { ok: true };
}

export function adminLogout(req: Request, res: Response): void {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", secure: isSecure(req), path: "/" });
}
