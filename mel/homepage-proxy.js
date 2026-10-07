const paths = new Set(["/api/mel/session", "/api/mel/turn"]);
const origins = new Set(["https://happitatlabs.com", "https://www.happitatlabs.com"]);

export async function proxyMel(request, env) {
  const url = new URL(request.url);
  const reject = (code, status) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
  if (!paths.has(url.pathname)) return reject("not_found", 404);
  if (request.method !== "POST") return reject("method_not_allowed", 405);
  if (!origins.has(url.origin) || request.headers.get("Origin") !== url.origin) return reject("forbidden", 403);
  if (!env.MEL_SERVICE) return reject("unavailable", 503);
  const headers = new Headers();
  for (const name of ["Origin", "Content-Type", "Content-Length", "Sec-Fetch-Site"]) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  // No Authorization, account cookies, user IP or browser fingerprint forwarded.
  const cookie = (request.headers.get("Cookie") ?? "").split(";").map(part => part.trim())
    .filter(part => part.startsWith("__Host-mel-browser="));
  if (cookie.length === 1 && cookie[0].length < 256) headers.set("Cookie", cookie[0]);
  try {
    const response = await env.MEL_SERVICE.fetch(new Request(`${url.origin}${url.pathname}`, { method: "POST", headers, body: request.body, duplex: "half", redirect: "manual" }));
    if (response.status >= 300 && response.status < 400) return reject("unavailable", 503);
    return response;
  } catch { return reject("unavailable", 503); }
}
