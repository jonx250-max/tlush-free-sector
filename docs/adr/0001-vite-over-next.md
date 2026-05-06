# ADR 0001 — Stay on Vite SPA, defer Next.js App Router migration

- Status: Accepted
- Date: 2026-04-29
- Supersedes: —
- Superseded by: —

## Context

The app is a React 18 + Vite 8 SPA with Vercel Functions for API. As we approach public launch, the question is whether to rewrite onto Next.js App Router (Server Components, Routing Middleware, Cache Components, Vercel AI Gateway, BotID drop-in) or keep hardening the SPA.

Constraints:
- Israeli labor-law correctness (Stage E in the ULTRAPLAN) is independent of frontend framework.
- P5 hardening (gitleaks, requireAdmin, threat model, SanitizedHtml, hash-chain audit) just shipped — discarding any of it during a rewrite is wasteful.
- Marketing pages are already statically prebuilt under `dist/marketing/`, so we already capture most SSR upside.
- The legal calculators in `src/services/**` have zero React deps and are framework-portable.

## Decision

Stay on the Vite SPA for the upcoming hardening sweep. Treat Next.js migration as an optional Stage K to revisit *after* legal-correctness, security, and test stages land.

## Consequences

### Positive
- No rewrite blast radius across 169 TS/TSX files.
- Stage E (legal correctness) and Stage C (security) ship faster.
- Diff-viewer streaming win is still achievable on Vite via `Response` streaming + React Suspense + `useTransition`.
- Once the data layer is typed (Kysely, Stage D) and tests are dense (Stage B), a future migration is much cheaper.

### Negative
- No native RSC; we can't shrink the JS shipped to the diff viewer page below SPA baseline today.
- No first-party Routing Middleware ergonomics for geo / admin gates — handled inside each handler.
- No drop-in Vercel BotID adapter; a Next migration would slot it in for free.
- No Vercel AI Gateway integration via `"provider/model"` strings; Anthropic SDK stays direct.

### Mitigations
- Bundle analyzer (Stage A item A5) makes JS weight observable so we don't drift.
- OCR + analysis-run streaming (Stage G item G4) gives the perceived-perf win without RSC.
- ADR will be revisited after Stage J completes; see `docs/adr/` for the eventual K decision.
