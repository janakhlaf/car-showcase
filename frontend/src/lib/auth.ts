/**
 * Admin authentication — stateless HMAC-signed session cookies.
 *
 * Passwords are stored as `salt:hash` using Node's scrypt KDF.
 * Sessions are `base64url(id.email.expiry).signature` cookies, verified
 * with a timing-safe comparison. All helpers run exclusively on the server.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "showroom_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    console.warn("[auth] ADMIN_SESSION_SECRET is not set — using an insecure dev secret.");
  }
  return "arena-dev-secret-do-not-use-in-production";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export interface SessionPayload {
  id: number;
  email: string;
  name: string;
}

function signPayload(payload: SessionPayload, exp: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined): (SessionPayload & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload & { exp: number };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Create the signed session cookie (route handlers only). */
export async function createSession(payload: SessionPayload) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, signPayload(payload, Date.now() + SESSION_TTL_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/** Read + verify the session cookie. Returns null when unauthenticated. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  const parsed = verifyToken(raw);
  if (!parsed) return null;
  return { id: parsed.id, email: parsed.email, name: parsed.name };
}
