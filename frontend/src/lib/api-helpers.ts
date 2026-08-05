/** Shared REST API helpers: uniform error envelopes + admin auth guard. */
import { ZodError } from "zod";
import { getSession, type SessionPayload } from "./auth";

export function jsonError(status: number, error: string, issues?: unknown): Response {
  return Response.json({ error, ...(issues ? { issues } : {}) }, { status });
}

export function zodIssues(error: ZodError) {
  return error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}

/** Guard for mutating admin endpoints. Returns the session or a ready 401 Response. */
export async function requireAdmin(): Promise<SessionPayload | Response> {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized — admin session required");
  return session;
}
