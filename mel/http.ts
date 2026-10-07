import { nextReset } from "./quota.js";

export const MEL_COOKIE = "__Host-mel-browser";
export const MEL_ORIGINS = ["https://happitatlabs.com", "https://www.happitatlabs.com"];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", ...headers,
    "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  } });
}

export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  return MEL_ORIGINS.includes(url.origin) && request.headers.get("Origin") === url.origin
    && !["cross-site", "same-site"].includes(request.headers.get("Sec-Fetch-Site") ?? "");
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json"
    || Number(request.headers.get("Content-Length")) > 8192 || !request.body) throw new Error("invalid_request");
  const reader = request.body.getReader();
  let size = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("invalid_request"));
      void reader.cancel().catch(() => {});
    }, 5000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error("invalid_request"); }
      text += decoder.decode(value, { stream: true });
    }
    const data: unknown = JSON.parse(text + decoder.decode());
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid_request");
    return data as Record<string, unknown>;
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

const encode = (value: string) => new TextEncoder().encode(value);
async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function digest(secret: string, value: string) {
  const bytes = await crypto.subtle.sign("HMAC", await hmacKey(secret), encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function identity(request: Request, secret: string, now: number, purpose: string) {
  const cookies = (request.headers.get("Cookie") ?? "").split(";").map((part) => part.trim());
  const matches = cookies.filter((part) => part.startsWith(`${MEL_COOKIE}=`));
  if (matches.length !== 1) return;
  const value = matches[0].slice(MEL_COOKIE.length + 1);
  const [id, expiry, signature, extra] = value.split(".");
  if (extra || !UUID.test(id) || !/^\d{13}$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature)
    || Number(expiry) <= now || Number(expiry) > now + 31 * 86400_000) return;
  const bytes = Uint8Array.from(signature.match(/../g)!, (pair) => parseInt(pair, 16));
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), bytes, encode(`${purpose}:${id}.${expiry}`));
  return valid ? id : undefined;
}

export const browserIdentity = (request: Request, secret: string, now = Date.now()) =>
  identity(request, secret, now, "mel-verified-cookie-v2");

// Only use after a new challenge passes, to preserve an existing visitor's quota.
export const legacyBrowserIdentity = (request: Request, secret: string, now = Date.now()) =>
  identity(request, secret, now, "mel-cookie");

export async function newCookie(secret: string, id: string, now = Date.now()) {
  const expiry = nextReset(now);
  const value = `${id}.${expiry}`;
  return `${MEL_COOKIE}=${value}.${await digest(secret, `mel-verified-cookie-v2:${value}`)}; Path=/; Max-Age=${Math.max(1, Math.floor((expiry - now) / 1000))}; Secure; HttpOnly; SameSite=Strict`;
}
