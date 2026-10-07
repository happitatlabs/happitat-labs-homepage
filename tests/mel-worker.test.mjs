import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import { Miniflare, createFetchMock } from "miniflare";
import homepage from "../worker.js";

const bundle = async (entry) => (await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022" })).outputFiles[0].text;
const workerCode = await bundle("mel/worker.ts");
const load = async (entry) => import(`data:text/javascript;base64,${Buffer.from(await bundle(entry)).toString("base64")}`);
const { reserve, quota, complete, cleanLedger, kstDay, nextReset } = await load("mel/quota.ts");
const { browserIdentity, newCookie } = await load("mel/http.ts");
const origin = "https://happitatlabs.com";
const key = "synthetic-mel-session-test-only-placeholder";
const provider = "https://unit-test-resource.openai.azure.com";
const responseBody = { status: "completed", output: [{ type: "message", role: "assistant", status: "completed",
  content: [{ type: "output_text", text: '{"answer_id":"person"}' }] }] };

async function runtime(t, overrides = {}, replyStatus = 200, delay = 0) {
  let calls = 0;
  const mock = createFetchMock();
  mock.disableNetConnect();
  const interceptor = mock.get(provider).intercept({ path: "/openai/v1/responses", method: "POST" })
    .reply(replyStatus, () => { calls++; return JSON.stringify(replyStatus === 200 ? responseBody : { private: "NEVER_DISPLAY" }); });
  if (delay) interceptor.delay(delay);
  interceptor.persist();
  const mf = new Miniflare({
    modules: true, script: workerCode, compatibilityDate: "2026-06-26", fetchMock: mock,
    durableObjects: { MEL_QUOTA: { className: "MelQuota", useSQLite: true } },
    bindings: { MEL_AI_ENABLED: "true", MEL_GLOBAL_DAILY_LIMIT: "30", MEL_SESSION_SECRET: key,
      MEL_AZURE_OPENAI_ENDPOINT: provider, MEL_AZURE_OPENAI_DEPLOYMENT: "test-selector",
      MEL_AZURE_OPENAI_API_KEY: "synthetic-placeholder-not-a-real-key", ...overrides },
  });
  t.after(async () => { await mf.dispose(); await mock.close(); });
  const post = (path, data, cookie = "", extra = {}) => mf.dispatchFetch(origin + path, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie, ...extra }, body: JSON.stringify(data),
  });
  const session = async () => {
    const response = await post("/api/mel/session", {});
    assert.equal(response.status, 200);
    const cookie = response.headers.get("Set-Cookie");
    assert.match(cookie, /; Secure; HttpOnly; SameSite=Strict$/);
    assert.doesNotMatch(cookie, /Domain=/i);
    return cookie.split(";")[0];
  };
  return { mf, post, session, calls: () => calls };
}

test("KST midnight resets browser/global allowance; failures retain global spend; metadata expires", () => {
  const ledger = { days: {} };
  const now = Date.parse("2026-10-07T14:59:50Z");
  assert.equal(kstDay(now), "2026-10-07");
  assert.equal(new Date(nextReset(now)).toISOString(), "2026-10-07T15:00:00.000Z");
  for (let i = 0; i < 3; i++) {
    const input = { browser: "visitor", requestId: String(i), fingerprint: "hash-only" };
    assert.equal(reserve(ledger, input, now, 3).kind, "reserved");
    complete(ledger, "visitor", String(i), i === 0 ? undefined : "person");
  }
  assert.equal(quota(ledger, "visitor", now).remaining, 1);
  assert.equal(reserve(ledger, { browser: "new-browser", requestId: "4", fingerprint: "hash" }, now, 3).kind, "global_limit");
  const after = nextReset(now);
  assert.equal(quota(ledger, "visitor", after).remaining, 3);
  assert.equal(reserve(ledger, { browser: "visitor", requestId: "5", fingerprint: "hash" }, after, 3).kind, "reserved");
  assert.equal(reserve(ledger, { browser: "visitor", requestId: "1", fingerprint: "hash-only" }, after, 3).kind, "cached");
  cleanLedger(ledger, after + 2 * 86400_000);
  assert.deepEqual(ledger.days, {});
});

test("expired reservations do not retry a provider, but release a browser slot", () => {
  const ledger = { days: {} };
  const now = Date.now();
  const input = { browser: "b", requestId: "r", fingerprint: "h" };
  assert.equal(reserve(ledger, input, now, 30).kind, "reserved");
  assert.equal(reserve(ledger, input, now + 1, 30).kind, "pending");
  assert.equal(reserve(ledger, input, now + 30_001, 30).kind, "failed");
  assert.equal(quota(ledger, "b", now + 30_001).remaining, 3);
  assert.equal(complete(ledger, "b", "r", "person"), false);
});

test("signed browser cookie rejects tampering, duplicate cookies and expiry; has no SQL claims", async () => {
  const now = Date.now();
  const id = randomUUID();
  const cookie = (await newCookie(key, id, now)).split(";")[0];
  const request = (value) => new Request(origin, { headers: { Cookie: value } });
  assert.equal(await browserIdentity(request(cookie), key, now), id);
  assert.equal(await browserIdentity(request(cookie.replace(id, randomUUID())), key, now), undefined);
  assert.equal(await browserIdentity(request(`${cookie}; ${cookie}`), key, now), undefined);
  assert.equal(await browserIdentity(request(cookie), key, now + 31 * 86400_000), undefined);
  assert.equal(await browserIdentity(request("sql_session=fake-sql-session"), key, now), undefined);
});

test("private Worker is default-off, rejects other origins, methods, paths and SQL-style auth", async (t) => {
  const r = await runtime(t, { MEL_AI_ENABLED: "false" });
  assert.equal((await r.post("/api/mel/session", {})).status, 503);
  assert.equal((await r.post("/api/mel/session", {}, "", { Origin: "https://other.example" })).status, 403);
  assert.equal((await r.mf.dispatchFetch(origin + "/api/mel/session")).status, 405);
  assert.equal((await r.post("/api/sql", {})).status, 404);
  assert.equal(r.calls(), 0);
});

test("three browser answers; fourth rejected; replay is free; no auth, question or secret echoed", async (t) => {
  const r = await runtime(t);
  assert.equal((await r.post("/api/mel/turn", { question: "프로젝트", requestId: randomUUID() }, "sql_session=synthetic")).status, 401);
  const cookie = await r.session();
  const first = { question: "PRIVATE_QUESTION_SENTINEL", requestId: randomUUID() };
  for (let i = 0; i < 3; i++) {
    const res = await r.post("/api/mel/turn", i === 0 ? first : { ...first, requestId: randomUUID() }, cookie);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.remaining, 2 - i);
    assert.equal(body.answer.id, "person");
    assert.match(body.answer.sources[0].url, /^https:\/\/happitatlabs.com\//);
    assert.doesNotMatch(JSON.stringify(body), /PRIVATE_QUESTION_SENTINEL|synthetic|session|api-key/);
  }
  assert.equal((await r.post("/api/mel/turn", first, cookie)).status, 200);
  assert.equal((await r.post("/api/mel/turn", { ...first, question: "changed" }, cookie)).status, 409);
  const rejected = await r.post("/api/mel/turn", { ...first, requestId: randomUUID() }, cookie);
  assert.equal(rejected.status, 429);
  assert.equal((await rejected.json()).code, "browser_limit");
  assert.equal(r.calls(), 3);
});

test("cookie resets cannot exceed the global attempted-call cap", async (t) => {
  const r = await runtime(t, { MEL_GLOBAL_DAILY_LIMIT: "2" });
  for (let i = 0; i < 3; i++) {
    const res = await r.post("/api/mel/turn", { question: "프로젝트", requestId: randomUUID() }, await r.session());
    assert.equal(res.status, i < 2 ? 200 : 429);
    if (i === 2) assert.equal((await res.json()).code, "global_limit");
  }
  assert.equal(r.calls(), 2);
});

test("failed provider attempts release browser quota but still exhaust the global cap", async (t) => {
  const r = await runtime(t, { MEL_GLOBAL_DAILY_LIMIT: "1" }, 500);
  const cookie = await r.session();
  const input = { question: "소개", requestId: randomUUID() };
  const failure = await r.post("/api/mel/turn", input, cookie);
  assert.equal(failure.status, 503);
  const data = await failure.json();
  assert.equal(data.remaining, 3);
  assert.equal(data.code, "failed");
  assert.doesNotMatch(JSON.stringify(data), /NEVER_DISPLAY/);
  assert.equal((await r.post("/api/mel/turn", input, cookie)).status, 503);
  assert.equal((await r.post("/api/mel/turn", { ...input, requestId: randomUUID() }, cookie)).status, 429);
  assert.equal(r.calls(), 1);
});

test("Durable Object atomically handles duplicate and concurrent requests", async (t) => {
  const r = await runtime(t, {}, 200, 150);
  const cookie = await r.session();
  const input = { question: "프로젝트", requestId: randomUUID() };
  const duplicate = await Promise.all(Array.from({ length: 8 }, () => r.post("/api/mel/turn", input, cookie)));
  assert.equal(duplicate.filter((res) => res.status === 200).length, 1);
  assert.equal(duplicate.filter((res) => res.status === 202).length, 7);
  assert.equal(r.calls(), 1);
  const results = await Promise.all(Array.from({ length: 8 }, () => r.post("/api/mel/turn", { ...input, requestId: randomUUID() }, cookie)));
  assert.equal(results.filter((res) => res.status === 200).length, 2);
  assert.equal(results.filter((res) => res.status === 429).length, 6);
  assert.equal(r.calls(), 3);
});

test("invalid request shapes, oversized input, forged cookies and cross-site fetches call no provider", async (t) => {
  const r = await runtime(t);
  const cookie = await r.session();
  for (const input of [{}, { question: "", requestId: randomUUID() }, { question: "x".repeat(1001), requestId: randomUUID() },
    { question: "hello", requestId: "not-uuid" }, { question: "hello", requestId: randomUUID(), history: [] }]) {
    assert.equal((await r.post("/api/mel/turn", input, cookie)).status, 400);
  }
  assert.equal((await r.post("/api/mel/session", { extra: "x".repeat(9000) })).status, 400);
  assert.equal((await r.post("/api/mel/session", {}, "", { "Sec-Fetch-Site": "cross-site" })).status, 403);
  assert.equal((await r.post("/api/mel/turn", { question: "hello", requestId: randomUUID() }, cookie + "x")).status, 401);
  assert.equal(r.calls(), 0);
});

test("global concurrency is two across different browsers", async (t) => {
  const r = await runtime(t, {}, 200, 200);
  const cookies = [];
  for (let i = 0; i < 6; i++) cookies.push(await r.session());
  const results = await Promise.all(cookies.map(cookie => r.post("/api/mel/turn", { question: "소개", requestId: randomUUID() }, cookie)));
  assert.equal(results.filter(res => res.status === 200).length, 2);
  assert.equal(results.filter(res => res.status === 429).length, 4);
  assert.equal(r.calls(), 2);
});

test("missing or unsafe global limits and session configuration fail closed", async (t) => {
  for (const overrides of [{ MEL_GLOBAL_DAILY_LIMIT: "" }, { MEL_GLOBAL_DAILY_LIMIT: "101" },
    { MEL_GLOBAL_DAILY_LIMIT: "-1" }, { MEL_SESSION_SECRET: "" }, { MEL_AZURE_OPENAI_API_KEY: "" }]) {
    const r = await runtime(t, overrides);
    assert.equal((await r.post("/api/mel/session", {})).status, 503);
    assert.equal(r.calls(), 0);
  }
});

test("homepage delegates only Mel paths without SQL auth; existing asset paths remain unchanged", async () => {
  let calls = 0;
  const env = {
    ASSETS: { fetch: async (request) => new Response("asset:" + new URL(request.url).pathname) },
    MEL_SERVICE: { fetch: async (request) => {
      calls++;
      assert.equal(request.headers.get("Authorization"), null);
      assert.equal(request.headers.get("Cookie"), "__Host-mel-browser=test");
      assert.equal(request.headers.get("CF-Connecting-IP"), null);
      assert.equal(new URL(request.url).search, "");
      return Response.json({ remaining: 3 });
    } },
  };
  const res = await homepage.fetch(new Request(origin + "/api/mel/session?ignored=1", { method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", Authorization: "Bearer synthetic",
      Cookie: "sql_session=synthetic; __Host-mel-browser=test", "CF-Connecting-IP": "192.0.2.1" }, body: "{}" }), env);
  assert.equal(res.status, 200);
  for (const path of ["/", "/products/sql-diagnoser", "/products/happy-habitat", "/products/dot-code-editor", "/assets/test.js"]) {
    assert.equal(await (await homepage.fetch(new Request(origin + path), env)).text(), "asset:" + path);
  }
  assert.equal(calls, 1);
  const config = JSON.parse(readFileSync("wrangler.mel.jsonc", "utf8"));
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.vars.MEL_AI_ENABLED, "false");
  assert.equal(config.services, undefined);
  const homepageConfig = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
  assert.deepEqual(homepageConfig.services, [{ binding: "MEL_SERVICE", service: "happitat-mel-guide" }]);
  assert.deepEqual(homepageConfig.assets.run_worker_first, ["/api/mel/*", "/api/lab-notes"]);
});

test("homepage service binding reaches the private Mel Worker in workerd", async (t) => {
  const mock = createFetchMock();
  mock.disableNetConnect();
  mock.get(provider).intercept({ path: "/openai/v1/responses", method: "POST" }).reply(200, responseBody);
  const mf = new Miniflare({ workers: [
    { name: "home", modules: true, script: await bundle("worker.js"), compatibilityDate: "2026-06-26",
      serviceBindings: { MEL_SERVICE: "mel" } },
    { name: "mel", modules: true, script: workerCode, compatibilityDate: "2026-06-26", fetchMock: mock,
      durableObjects: { MEL_QUOTA: { className: "MelQuota", useSQLite: true } },
      bindings: { MEL_AI_ENABLED: "true", MEL_GLOBAL_DAILY_LIMIT: "30", MEL_SESSION_SECRET: key,
        MEL_AZURE_OPENAI_ENDPOINT: provider, MEL_AZURE_OPENAI_DEPLOYMENT: "test-selector",
        MEL_AZURE_OPENAI_API_KEY: "synthetic-only" } },
  ] });
  t.after(async () => { await mf.dispose(); await mock.close(); });
  const post = (path, body, cookie = "") => mf.dispatchFetch(origin + path, { method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });
  const session = await post("/api/mel/session", {});
  assert.equal(session.status, 200);
  const cookie = session.headers.get("Set-Cookie").split(";")[0];
  const turn = await post("/api/mel/turn", { question: "어떤 일을 하나요?", requestId: randomUUID() }, cookie);
  assert.equal(turn.status, 200);
  assert.equal((await turn.json()).remaining, 2);
});

test("homepage Lab Notes keeps returning RSS JSON without calling Mel", async (t) => {
  const mock = createFetchMock();
  mock.disableNetConnect();
  mock.get("https://paski.tistory.com").intercept({ path: "/rss", method: "GET" })
    .reply(200, "<rss><channel><item><title>Public note</title><link>https://paski.tistory.com/1</link><pubDate>Wed, 07 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>");
  const mf = new Miniflare({ modules: true, script: await bundle("worker.js"),
    compatibilityDate: "2026-06-26", fetchMock: mock });
  t.after(async () => { await mf.dispose(); await mock.close(); });
  const response = await mf.dispatchFetch(origin + "/api/lab-notes");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /application\/json/);
  assert.deepEqual(await response.json(), { notes: [{ title: "Public note",
    url: "https://paski.tistory.com/1", publishedAt: "2026.10.07" }] });
});
