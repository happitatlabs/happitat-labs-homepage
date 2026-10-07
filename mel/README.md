# Mel AI: Isolated Homepage Guide

The homepage uses an independent, private Mel Worker. Reuse of an existing Azure
connection and the Mel-only cloud configuration was approved on 2026-10-07.
Production SQL code, Workers, accounts, Credits, payments and configuration are
out of scope and were not changed. No SQL Worker credentials were exported.

## Architecture

```text
Existing static guide (always available)
  + AI UI (VITE_MEL_AI_ENABLED=false hides it at build time)
  -> homepage /api/mel/session, /api/mel/turn (POST, same origin)
  -> MEL_SERVICE service binding
  -> private happitat-mel-guide Worker (no workers.dev / preview URL)
  -> dedicated MelQuota Durable Object: durable admission first
  -> Azure Responses: reviewed answer ID only
  -> local reviewed answer and public evidence links
```

No PC process, Tailscale, public tunnel, SQL login/Worker, Credits, payments or SQL
data are used. No dependency was added. Homepage `wrangler.jsonc` includes only
the Mel service binding and worker-first `/api/mel/*` routing additions. Existing
`/api/lab-notes` is explicitly worker-first too, preventing the SPA fallback from
replacing RSS JSON with HTML.

## Access and Cost Boundaries

- Three successful answers per anonymous browser-cookie identity per Korean
  calendar day. Pending requests reserve slots; provider failures release browser
  slots. The unknown answer is still a completed, counted answer.
- Signed `__Host-mel-browser` cookie: HttpOnly, Secure, SameSite=Strict, 30 days,
  no Domain. This is NOT an account/person limit. Clearing/blocking cookies,
  new profiles or another hostname change identity. Root/www have separate host
  cookies but use the SAME global quota object.
- Global ceiling: **30 attempted provider calls/day**, KST reset, maximum
  two in flight. Failures, disconnects and unknown answers consume global budget.
  Missing/invalid cap configuration fails closed; supported range is 1-100.
  This is a call ceiling, not a monetary billing guarantee. Model/input pricing
  and Cloudflare resource usage still matter.
- Durable Object storage transactions commit admission before provider I/O.
  No client counters or eventually consistent KV limits.
- Client UUID + browser identity + HMAC question digest provide deduplication.
  Duplicate pending/completed/failed requests never repeat the provider call.
  Changed text with the same ID returns 409. No automatic client/provider retry.
  Network uncertainty preserves the UUID for explicit recovery while the panel
  remains mounted. Closing the panel cannot cancel a reserved server attempt:
  an answer may complete/count after browser disconnection.
- Abandoned reservations expire after 30 seconds, retaining global spend; the
  same ID cannot silently repeat a failed request.
- No CORS allowance or SQL Authorization/cookie forwarding. Same-origin POST
  and signed cookies are browser boundaries, not bot authentication. Bots can
  still exhaust the daily cap; this is not complete abuse prevention.
- Do not rename/recreate the quota namespace to reset spend during a day.
- If SQL and Mel share an Azure deployment, TPM/RPM capacity and billing are
  shared. Mel's daily cap does not guarantee zero impact on SQL traffic. Check
  existing capacity without changing SQL's allocation or deployment. No SQL
  account, application endpoint, database or session is shared by this design.

## Public Data and Privacy

`answers.ts` reads only current public `src/content.ts` guide/product descriptions.
No private personas, memory, project files, live SQL or fetched documents.

Azure receives the current question and reviewed candidates, returning a strict
single-field answer ID. Generated prose/URLs are never rendered. Unsupported IDs,
extra fields and malformed outputs become a fixed unknown answer. Semantic
selection errors remain possible. Mock tests are not real-model accuracy or
complete prompt-injection-defense evidence.

The visitor opts in before cookie creation. UI discloses Azure transmission,
cookie-based limits and not to send private data. No localStorage/sessionStorage
conversation history. Application code stores no question bodies, IPs, user
agents, accounts or generated replies. The quota ledger holds anonymous
browser/request IDs, HMAC question digest, timestamps, completion status and a
reviewed answer ID for deduplication. Daily alarms remove these in at most
48 hours. There is no conversation-history API.

Provider calls use `store:false`, no tools/continuation/user identifiers. This
requests no Responses storage; it is NOT zero provider retention or abuse
monitoring. Cloudflare/Azure infrastructure policies apply separately. Mel Worker
observability is off; existing homepage observability is unchanged. No code logs
questions, credentials, provider bodies or raw provider exceptions.

Bounds: 1,000 question characters, 32 KiB assembled input, 256 output tokens,
16 KiB output, 15-second deadline, no retry. Redirects are manual and non-2xx
responses rejected; workerd does not support redirect:error.

## Configuration

- Private Worker: `happitat-mel-guide`, with a dedicated SQLite-backed `MelQuota`
  Durable Object. No public Worker/preview URL, domain or SQL binding.
- Homepage-only `MEL_SERVICE` binding. Existing domains, lab notes, assets and
  product routes are preserved.
- Four Mel Worker secrets: `MEL_AZURE_OPENAI_API_KEY`,
  `MEL_AZURE_OPENAI_ENDPOINT`, `MEL_AZURE_OPENAI_DEPLOYMENT`, `MEL_SESSION_SECRET`.
  These were supplied via secret-bulk stdin, never a temporary credential file,
  client-side VITE variable or repository file. The session key is independently
  generated. No secret values are recorded here.
- The connection was found in an approved local Azure environment file; that
  file was not changed. Whether operating SQL uses this same model deployment
  has NOT been established. Shared capacity headroom is NOT verified. Do not
  increase Mel's limits without checking capacity and cost.
- `MEL_AI_ENABLED` defaults false in `wrangler.mel.jsonc`. Production enablement
  uses an explicit `--var MEL_AI_ENABLED:true` deployment override. A default
  private-Worker deployment intentionally switches AI off.
- `VITE_MEL_AI_ENABLED` is a non-secret UI flag, default on. Set it to `false`
  during a homepage build to hide AI while retaining the basic guide. Homepage
  deployments do not redeploy or change the private Mel Worker.

## Verification and Release Order

Local commands (synthetic credentials, provider networking disabled):

```text
npm run typecheck:mel
npm run test:mel
npm run build
node tests/portfolio-guide.cjs
node tests/mel-ui.cjs
```

Tests cover adapter, quota, cookie, workerd/Miniflare and service bindings.
Existing Wrangler dependencies provide runtime/bundler. Browser scripts use the
existing Playwright via `PLAYWRIGHT_MODULE` and `GUIDE_BASE_URL` for loopback Vite.
Run static regressions with the UI flag off, AI tests with it true. API responses
are synthetic. Screenshots/compiled tests use ignored `.tmp-*` folders.

Local verification on 2026-10-07: 25 backend test groups passed, TypeScript and
UI-enabled/default builds passed. Static-guide regression and opt-in AI browser
tests passed at 1440x1000, 390x844, 320x568 and 667x375 (including a resized
420px viewport). Screenshots were visually inspected at desktop/mobile sizes.

Production API verification on 2026-10-07 used exactly three Azure calls: person,
SQL Diagnoser and an adversarial unsupported request selected the expected
reviewed IDs (`person`, `product-sql-diagnoser`, `unknown`). All returned 200.
The fourth new question was rejected (429), a duplicate returned the cached
answer, and session status retained zero remaining. Cross-origin access returned
403 and a turn without the Mel cookie returned 401, without provider calls.
KST reset reported 2026-10-07T15:00:00Z (the next Korean midnight). These three
checks demonstrate integration, NOT comprehensive accuracy or attack defense.
`tests/mel-live.mjs` requires `--allow-three-live-calls` and is intentionally not
part of CI. Re-running it consumes up to three additional provider calls.

Verified private Mel version: `65135a91-94c4-4172-9b91-4b8751800725`.
API staging homepage version: `9133e1c9-b4a8-494b-82d9-7eead09621cf` (AI UI
was hidden until the live checks passed). Base homepage release was `7786dbf`.
Use Wrangler deployments/version metadata to identify the latest UI release.

Dry-run only; these commands do NOT publish:

```text
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config wrangler.mel.jsonc
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config wrangler.jsonc
```

For later releases: inspect the active homepage version and remote main first.
Build and run local tests before deploying the homepage's default config. Do not
deploy unrelated SQL changes or replace its routes/configuration. A dry-run or
mock test is not release confirmation.

Emergency stop: disable `MEL_AI_ENABLED` on private Mel Worker; static guide
continues. Building with `VITE_MEL_AI_ENABLED=false` hides AI. Neither requires a SQL deployment.
Never roll back unrelated SQL work.

Deferred: account login, bot challenge, analytics, streaming, free generation,
external search, private memory, voice and persistent conversation history.

## References

- [Azure Responses](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)
- [Azure structured outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
- [Cloudflare HTTP service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/)
- [Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
