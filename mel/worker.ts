import { answerPublicQuestion, melAzureReady, MEL_LIMITS, type MelAzureEnv } from "./azure.js";
import { renderSelection } from "./answers.js";
import { browserIdentity, digest, json, newCookie, readBody, sameOrigin, UUID } from "./http.js";
import { cleanLedger, complete, nextReset, quota, reserve, type Ledger } from "./quota.js";

interface StorageTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  setAlarm(time: number): Promise<void>;
}
interface Storage extends StorageTransaction {
  transaction<T>(closure: (transaction: StorageTransaction) => Promise<T>): Promise<T>;
}
type Env = MelAzureEnv & {
  MEL_SESSION_SECRET?: string;
  MEL_GLOBAL_DAILY_LIMIT?: string;
  MEL_QUOTA: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
};

function configurationReady(env: Env) {
  return melAzureReady(env) && /^[1-9]\d{0,2}$/.test(env.MEL_GLOBAL_DAILY_LIMIT ?? "")
    && Number(env.MEL_GLOBAL_DAILY_LIMIT) <= 100 && (env.MEL_SESSION_SECRET?.length ?? 0) >= 32
    && Boolean(env.MEL_QUOTA);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (!["/api/mel/session", "/api/mel/turn"].includes(path)) return json({ code: "not_found" }, 404);
    if (request.method !== "POST") return json({ code: "method_not_allowed" }, 405, { Allow: "POST" });
    if (!sameOrigin(request)) return json({ code: "forbidden" }, 403);
    if (!configurationReady(env)) return json({ code: "unavailable" }, 503);
    let data;
    try { data = await readBody(request); } catch { return json({ code: "invalid_request" }, 400); }
    const session = path.endsWith("/session");
    if (session ? Object.keys(data).length !== 0 : Object.keys(data).sort().join(",") !== "question,requestId"
      || typeof data.question !== "string" || !data.question.trim() || data.question.length > MEL_LIMITS.questionCharacters
      || typeof data.requestId !== "string" || !UUID.test(data.requestId)) return json({ code: "invalid_request" }, 400);
    try {
      let browser = await browserIdentity(request, env.MEL_SESSION_SECRET!);
      if (!browser && !session) return json({ code: "session_required" }, 401);
      const created = !browser;
      browser ??= crypto.randomUUID();
      const response = await env.MEL_QUOTA.get(env.MEL_QUOTA.idFromName("mel-global-v1")).fetch(new Request("https://mel.internal/" + (session ? "session" : "turn"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browser, ...data }),
      }));
      if (!session || !created || !response.ok) return response;
      const headers = new Headers(response.headers);
      headers.set("Set-Cookie", await newCookie(env.MEL_SESSION_SECRET!, browser));
      return new Response(response.body, { status: response.status, headers });
    } catch { return json({ code: "unavailable" }, 503); }
  },
};

// One private Durable Object serializes reservations across browsers and isolates
// quota state from SQL. Provider I/O must stay outside storage transactions.
export class MelQuota {
  constructor(private state: { storage: Storage }, private env: Env) {}

  private async ledger<T>(operation: (ledger: Ledger, now: number) => T): Promise<T> {
    return this.state.storage.transaction(async (transaction) => {
      const now = Date.now();
      const ledger = await transaction.get<Ledger>("ledger") ?? { days: {} };
      cleanLedger(ledger, now);
      const result = operation(ledger, now);
      await transaction.put("ledger", ledger);
      // Even without new visitors, remove identifiers within 48 hours.
      if (Object.keys(ledger.days).length) await transaction.setAlarm(nextReset(now));
      return result;
    });
  }

  async alarm() { await this.ledger(() => undefined); }

  async fetch(request: Request): Promise<Response> {
    if (!configurationReady(this.env)) return json({ code: "unavailable" }, 503);
    const data = await request.json() as { browser: string; question: string; requestId: string };
    const { browser, question, requestId } = data;
    if (!UUID.test(browser)) return json({ code: "invalid_request" }, 400);
    if (new URL(request.url).pathname === "/session") return json(await this.ledger((ledger, now) => quota(ledger, browser, now)));
    if (typeof question !== "string" || !question.trim() || question.length > MEL_LIMITS.questionCharacters || !UUID.test(requestId)) {
      return json({ code: "invalid_request" }, 400);
    }
    const fingerprint = await digest(this.env.MEL_SESSION_SECRET!, `mel-question:${browser}:${question}`);
    const admission = await this.ledger((ledger, now) => ({
      admission: reserve(ledger, { browser, requestId, fingerprint }, now, Number(this.env.MEL_GLOBAL_DAILY_LIMIT)),
      quota: quota(ledger, browser, now),
    }));
    if (admission.admission.kind === "cached") return json({ ...admission.quota, answer: renderSelection(JSON.stringify({ answer_id: admission.admission.answerId })) });
    if (admission.admission.kind !== "reserved") {
      const code = admission.admission.kind;
      const status = code === "pending" ? 202 : code === "conflict" ? 409 : code === "failed" ? 503 : 429;
      return json({ ...admission.quota, code }, status);
    }
    try {
      const answer = await answerPublicQuestion(question, this.env);
      const result = await this.ledger((ledger, now) => ({
        saved: complete(ledger, browser, requestId, answer.id), ...quota(ledger, browser, now),
      }));
      if (!result.saved) return json({ code: "failed", remaining: result.remaining, resetAt: result.resetAt }, 503);
      return json({ answer, remaining: result.remaining, resetAt: result.resetAt });
    } catch {
      // Failed attempts still occupy the global daily budget; only the visitor's
      // answer reservation is released. Never expose upstream exception data.
      const remaining = await this.ledger((ledger, now) => {
        complete(ledger, browser, requestId);
        return quota(ledger, browser, now);
      });
      return json({ ...remaining, code: "failed" }, 503);
    }
  }
}
