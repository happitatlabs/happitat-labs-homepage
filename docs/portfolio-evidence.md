# Portfolio content evidence

Reviewed 2026-09-18. The deployed repository is the standalone
`happitat-labs-homepage` repository; the older copy inside `AI_Project` is
not the deployment source. Existing routes remain available; the home page
features SQL Diagnoser, Happy Habitat and Dot Code Editor in that order.

## SQL Diagnoser

Evidence reviewed in `AI_Project/public-sql-diagnoser-mvp`:

- `README.md`: problem, scope, static analysis limitations and deployment boundary.
- `src/App.tsx`: input/result workflow, UI, report generation.
- `src/sqlExplainer.ts`: tables, JOIN, WHERE/HAVING, aggregation, CTE,
  CASE and window-function extraction.
- `src/systemGraph.ts`, `src/riskDetector.ts`: dependencies and review candidates.
- `src/sqlChangeReview.ts`: before/after structural comparison.
- `api/ai-provider.ts`: implemented OpenAI, Azure OpenAI and Ollama adapters.
- `src/sqlMasking.ts`: masking before optional AI requests.
- `src/cloudflareWorker.ts`: optional server AI routes and access configuration.
- `tests/sqlExplainer.test.mjs`: fixtures, masking, comparisons, AI error cases.

Existing `npm test` passed during this review. This supports the description
of automated checks, not a production-accuracy or user-outcome claim.
Provider implementation does not imply availability in the public deployment.
No runtime credentials or real customer data were used to validate AI providers.

## Other products

Happy Habitat retains its existing Google Play status and link. Its purpose
is consistent with `AI_Project/Happy habitat/README.md`; local v2 features
were not presented as verified features of the store release.

Dot Code Editor retains its existing demo link and introduction. The local
`AI_Project/dot-code-editor-mvp` copy is a scaffold, so no additional feature
or individual ownership claims were inferred from it.

## Verification

TypeScript and Vite build; SQL project's existing tests; desktop (1440px)
and mobile (390px) route/layout checks; four time themes; reduced-motion
visibility; external demo, GitHub and Notion HTTP responses.
