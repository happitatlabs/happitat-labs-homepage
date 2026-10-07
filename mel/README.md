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
data are used. No product dependency was added. Homepage `wrangler.jsonc` includes
the Mel service binding, Mel-only rate limiters and worker-first `/api/mel/*` routing. Existing
`/api/lab-notes` is explicitly worker-first too, preventing the SPA fallback from
replacing RSS JSON with HTML.

## Access and Cost Boundaries

- Three successful answers per anonymous browser-cookie identity per Korean
  calendar day. Pending requests reserve slots; provider failures release browser
  slots. The unknown answer is still a completed, counted answer.
- Signed `__Host-mel-browser` cookie: HttpOnly, Secure, SameSite=Strict, expires at the next KST midnight,
  no Domain. This is NOT an account/person limit. Clearing/blocking cookies,
  new profiles or another hostname change identity. Root/www have separate host
  cookies but use the SAME global quota object.
- Managed Turnstile is loaded only after opt-in. Siteverify must accept the
  single-use token, exact hostname, `mel_session` action and five-minute timestamp.
  Missing configuration or verification failures fail closed. The new v2 cookie
  cannot be minted without a challenge. Older cookies require a challenge too;
  a valid old identity is retained after verification so its quota is not reset.
- Homepage-only IP counters: 20 Mel requests/minute, including at most 5 session
  requests/minute. Only Cloudflare's `CF-Connecting-IP` is used, never a caller's
  forwarded IP. These edge limits are approximate and per Cloudflare location,
  not global accounting. Shared networks may hit a temporary limit together.
  The separate Durable Object remains the authoritative global provider budget.
- Global ceiling: **30 attempted provider calls/day**, KST reset, maximum
  two in flight. Failures, disconnects and unknown answers consume global budget.
  Missing/invalid cap configuration fails closed; supported range is 1-100.
  This is a call ceiling, not a monetary billing guarantee. Model/input pricing
  and Cloudflare resource usage still matter.
- Durable Object storage transactions commit admission before provider I/O.
  Status/denied calls do not rewrite an unchanged ledger. Retention alarms still
  advance without new visitors. No client counters or KV are used for accounting.
- Client UUID + browser identity + HMAC question digest provide deduplication.
  Duplicate pending/completed/failed requests never repeat the provider call.
  Changed text with the same ID returns 409. No automatic client/provider retry.
  Network uncertainty preserves the UUID for explicit recovery while the panel
  remains mounted. Closing the panel cannot cancel a reserved server attempt:
  an answer may complete/count after browser disconnection.
- Abandoned reservations expire after 30 seconds, retaining global spend; the
  same ID cannot silently repeat a failed request.
- No CORS allowance or SQL Authorization/cookie forwarding. Same-origin POST
  and signed cookies are browser boundaries. Turnstile and throttling reduce
  automated abuse but do not establish one human per identity. Distributed bots
  or repeated successful challenges can still exhaust the daily cap.
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
conversation history. Cloudflare temporarily uses an IP counter for throttling;
IP is not forwarded to Mel, Turnstile Siteverify or Azure by application code.
The Turnstile browser widget itself is a Cloudflare service with its own data
processing. Application code stores no question bodies, IPs, user agents,
accounts or generated replies. The quota ledger holds anonymous
browser/request IDs, HMAC question digest, timestamps, completion status and a
reviewed answer ID for deduplication. Daily alarms remove these in at most
48 hours. There is no conversation-history API.

Provider calls use `store:false`, no tools/continuation/user identifiers. This
requests no Responses storage; it is NOT zero provider retention or abuse
monitoring. Cloudflare/Azure infrastructure policies apply separately. Mel Worker
observability is off; existing homepage observability is unchanged. No code logs
questions, credentials, provider bodies or raw provider exceptions.

Bounds: 8 KiB request body with a five-second read deadline; 2,048-character
challenge, five-second verification deadline and 8 KiB verification response.
Provider: 1,000 question characters, 32 KiB assembled input, 256 output tokens,
16 KiB output, 15-second deadline, no retry. Redirects are manual and non-2xx
responses rejected; workerd does not support redirect:error.

## Configuration

- Private Worker: `happitat-mel-guide`, with a dedicated SQLite-backed `MelQuota`
  Durable Object. No public Worker/preview URL, domain or SQL binding.
- Homepage-only `MEL_SERVICE` binding. Existing domains, lab notes, assets and
  product routes are preserved.
- Five Mel Worker secrets: `MEL_AZURE_OPENAI_API_KEY`,
  `MEL_AZURE_OPENAI_ENDPOINT`, `MEL_AZURE_OPENAI_DEPLOYMENT`, `MEL_SESSION_SECRET`,
  `MEL_TURNSTILE_SECRET_KEY`.
  These were supplied via secret-bulk stdin, never a temporary credential file,
  client-side VITE variable or repository file. The session key is independently
  generated. No secret values are recorded here.
- Dedicated managed Turnstile widget: **Happitat Mel Guide**, only the root and
  www homepage hosts, pre-clearance disabled. `src/MelChallenge.tsx` contains its
  public site key, never the secret. The existing SQL widget is untouched.
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
existing Playwright via `PLAYWRIGHT_MODULE` and `GUIDE_BASE_URL` for loopback
Wrangler preview. Static-guide tests also pass with AI enabled but collapsed.
API responses and the challenge widget are synthetic in local tests; neither
contacts a real provider. Screenshots/compiled tests use ignored `.tmp-*` folders.

Local hardening verification on 2026-10-07: all 33 backend test groups,
TypeScript and the UI-enabled build passed. Clean `npm ci --ignore-scripts`
succeeded and `npm audit` reported zero known vulnerabilities. Static-guide regression and opt-in AI browser
tests passed at 1440x1000, 390x844, 320x568 and 667x375 (including a resized
420px viewport). Screenshots were visually inspected at desktop/mobile sizes.

Production API verification on 2026-10-07 used exactly three Azure calls: person,
SQL Diagnoser and an adversarial unsupported request selected the expected
reviewed IDs (`person`, `product-sql-diagnoser`, `unknown`). All returned 200.
These were pre-hardening checks. The fourth new question was rejected (429), a duplicate returned the cached
answer, and session status retained zero remaining. Cross-origin access returned
403 and a turn without the Mel cookie returned 401, without provider calls.
KST reset reported 2026-10-07T15:00:00Z (the next Korean midnight). These three
checks demonstrate integration, NOT comprehensive accuracy or attack defense.
`tests/mel-live.mjs --verify-security` now checks public headers and rejection
boundaries only, without authenticated turns or Azure calls. Real Turnstile
verification is checked interactively, never bypassed by a test flag. The script
is intentionally not part of CI. Do not export browser cookies or tokens.

Pre-hardening private Mel version: `65135a91-94c4-4172-9b91-4b8751800725`.
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

For the challenge rollout, publish the compatible homepage UI/rate bindings
first, then the private Mel Worker with `--var MEL_AI_ENABLED:true`. Keep the
existing quota namespace, migration tag, session secret and global budget.

## Browser and Toolchain Hardening

Static assets include CSP, DENY framing and one-day HSTS. Only same-origin
scripts and the official Cloudflare challenge script/frame are allowed. Inline
styles remain allowed for existing React style variables/privacy-page styles;
inline scripts and eval are not allowed. HSTS excludes subdomains/preload so it
does not impose new policies on unrelated services. Mel JSON also denies framing.

Wrangler is updated to 4.148.0. Its Miniflare development dependency has a narrow
`sharp: 0.35.5` override for the upstream security fix. This is build tooling,
not a new homepage runtime dependency. Recheck the override on later Wrangler
upgrades. An audit result only covers advisories known to npm at check time.

Emergency stop: disable `MEL_AI_ENABLED` on private Mel Worker; static guide
continues. Building with `VITE_MEL_AI_ENABLED=false` hides AI. Neither requires a SQL deployment.
Never roll back unrelated SQL work.

Deferred: account login, analytics, streaming, free generation,
external search, private memory, voice and persistent conversation history.

## References

- [Azure Responses](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses)
- [Azure structured outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
- [Cloudflare HTTP service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/)
- [Durable Object storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
