const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const MEL_CHALLENGE_ACTION = "mel_session";

export async function verifyTurnstile(token: unknown, secret: string, hostname: string): Promise<boolean> {
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    if (!response.ok || !response.body) { await response.body?.cancel(); return false; }
    const reader = response.body.getReader();
    let size = 0;
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: true });
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); return false; }
        text += decoder.decode(value, { stream: true });
      }
      const result = JSON.parse(text + decoder.decode());
      const age = Date.now() - Date.parse(result.challenge_ts);
      return result.success === true && result.hostname === hostname
        && result.action === MEL_CHALLENGE_ACTION && age >= -30_000 && age <= 300_000;
    } finally { reader.releaseLock(); }
  } catch { return false; }
}
