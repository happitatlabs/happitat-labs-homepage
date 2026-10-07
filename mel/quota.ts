export const BROWSER_DAILY_LIMIT = 3;
export const CONCURRENCY_LIMIT = 2;
const DAY = 86400_000;
const KST = 9 * 3600_000;
const LEASE_MS = 30_000;

type Attempt = {
  browser: string; requestId: string; fingerprint: string; startedAt: number;
  state: "pending" | "complete" | "failed"; answerId?: string;
};
export type Ledger = { days: Record<string, Attempt[]> };
export type Quota = { remaining: number; resetAt: string };
export type Admission = { kind: "reserved" | "pending" | "failed" | "conflict" | "browser_limit" | "global_limit" | "busy" }
  | { kind: "cached"; answerId: string };

export function kstDay(now: number) { return new Date(now + KST).toISOString().slice(0, 10); }
export function nextReset(now: number) { return (Math.floor((now + KST) / DAY) + 1) * DAY - KST; }

export function cleanLedger(ledger: Ledger, now: number) {
  for (const [day, attempts] of Object.entries(ledger.days)) {
    if (Date.parse(`${day}T00:00:00+09:00`) + 2 * DAY <= now) { delete ledger.days[day]; continue; }
    for (const attempt of attempts) {
      if (attempt.state === "pending" && attempt.startedAt + LEASE_MS <= now) attempt.state = "failed";
    }
  }
}

export function quota(ledger: Ledger, browser: string, now: number): Quota {
  const spent = (ledger.days[kstDay(now)] ?? []).filter((attempt) => attempt.browser === browser && attempt.state !== "failed").length;
  return { remaining: Math.max(0, BROWSER_DAILY_LIMIT - spent), resetAt: new Date(nextReset(now)).toISOString() };
}

export function reserve(ledger: Ledger, input: { browser: string; requestId: string; fingerprint: string }, now: number, dailyCap: number): Admission {
  cleanLedger(ledger, now);
  const attempts = Object.values(ledger.days).flat();
  const existing = attempts.find((attempt) => attempt.browser === input.browser && attempt.requestId === input.requestId);
  if (existing) {
    if (existing.fingerprint !== input.fingerprint) return { kind: "conflict" };
    return existing.state === "complete" ? { kind: "cached", answerId: existing.answerId! } : { kind: existing.state };
  }
  if (quota(ledger, input.browser, now).remaining === 0) return { kind: "browser_limit" };
  const today = ledger.days[kstDay(now)] ?? [];
  if (today.length >= dailyCap) return { kind: "global_limit" };
  if (attempts.filter((attempt) => attempt.state === "pending").length >= CONCURRENCY_LIMIT) return { kind: "busy" };
  today.push({ ...input, startedAt: now, state: "pending" });
  ledger.days[kstDay(now)] = today;
  return { kind: "reserved" };
}

export function complete(ledger: Ledger, browser: string, requestId: string, answerId?: string) {
  const attempt = Object.values(ledger.days).flat().find((item) => item.browser === browser && item.requestId === requestId);
  if (!attempt || attempt.state !== "pending") return false;
  attempt.state = answerId ? "complete" : "failed";
  if (answerId) attempt.answerId = answerId;
  return true;
}
