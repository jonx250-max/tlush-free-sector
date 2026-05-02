# Architecture

Top-level map of how Tlush Free Sector hangs together. Companion docs:
- ADRs: `docs/adr/` — accepted decisions with reasoning.
- Threat model: `data/security/threat-model.md`.
- Phase-2 SPARC: `docs/architecture/phase-2-sparc.md`.
- Setup: `docs/SETUP.md`.
- Operator runbook: `docs/runbook.md`.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 8 SPA + TypeScript |
| Routing | react-router-dom 7 (client-side) |
| Styling | Tailwind 3 + custom UI primitives in `src/components/ui/` |
| Forms / validation | react-hook-form + Zod |
| Animation | framer-motion |
| State | React hooks + Supabase client (no global store yet) |
| Backend | Vercel Functions (Node 22 in CI, runs on Fluid Compute) |
| Database | Supabase Postgres + raw SQL migrations + RLS |
| Auth | Supabase Auth (email + Google OAuth + phone OTP) |
| OCR / LLM | Google Cloud Vision REST + Anthropic Claude Haiku |
| Test | Vitest (unit/integration) + Playwright (e2e) |

## Top-level layout

```
api/                    Vercel Function handlers (serverless)
  _lib/                 shared utilities (config, geo, rate-limit, OCR, audit)
  audit/, auth/, analyses/   route groups
src/
  components/           React UI
  services/             business logic (parsers, calculators, diff engine)
    diff/               per-rule diff modules
  lib/                  client adapters (auth, supabase, audit log, pricing)
  pages/                top-level route components
  data/                 Israeli labor-law lookup tables (settlements etc.)
  i18n/                 Hebrew translation object
  types/                shared TS types
data/
  laws/                 versioned law fixtures (overtime, minimum wage, …)
  security/             threat model
docs/                   architecture + ADRs + runbook
public/                 static assets, marketing landing pages
supabase/migrations/    raw SQL migrations (00001…)
.github/workflows/      CI + security + auto-update-laws
```

## Data flow — analyse one payslip

```
client (UploadPage)
  → PDF/image → src/services/payslipParser.ts (table/regex/hybrid)
     ↳ regex miss → POST /api/ocr  (Vision + Claude Haiku, validated by Zod)
  → src/services/contractParser.ts (PDF text only, ExtractedField<T> with confidence)
  → src/services/diffEngine.ts orchestrates rules in src/services/diff/
     ↳ basePay, minimumWage, amendment24, commission, overtime, pension,
        kerenHishtalmut, benefits, tax
  → AnalysisFinding[] — { severity, gapDirection, legalReference, explanation }
  → POST /api/analyses/run  (persists checks + appends audit_log via hash chain)
  → ResultsPage renders findings (DiscrepancyViewer planned)
  → DemandLetter generated (DOMPurify-sanitized HTML, Hebrew, printable)
```

## Configuration

All env reads go through one schema-validated entry point:
- Server: `api/_lib/serverConfig.ts` → `getServerConfig()`. Re-parses `process.env` per call.
- Client: `src/lib/appConfig.ts` → `appConfig` (built once at module load from `import.meta.env`).

Both schemas are Zod and reject malformed values rather than silently coercing. Handlers still own their CONFIG_MISSING response shape; the config layer just narrows env-var sprawl.

## Security posture (P5)

- Geo-block IL-only (`api/_lib/geoCheck.ts`) with invite-token bypass.
- Per-IP rate-limit via `rate_limit_check` Postgres RPC (`api/_lib/rateLimit.ts`).
- `requireAdmin()` middleware ready for any future admin endpoint (no live admin route yet).
- DOMPurify-wrapped `SanitizedHtml` component for all user-facing HTML rendering.
- CSP / HSTS / X-Frame-Options headers in `vercel.json`.
- gitleaks + Semgrep + CodeQL + npm audit + Dependency Review in `.github/workflows/security.yml`.
- Audit log uses SHA-256 hash chain inside an advisory-locked Postgres function; `FOR DELETE USING (false)` blocks deletion.
- File-upload deep validation, prompt-injection guard, PII redaction, MFA — Stage C.

## Test coverage

- 375 unit/integration tests (vitest).
- 1 Playwright smoke spec.
- Coverage tooling, mutation testing, property-based math, law truth-tables, OCR golden corpus, axe-core a11y, visual regression — Stage B.

## Known limitations / next stages

See the active ULTRAPLAN at `~/.claude/plans/you-are-an-elite-purring-harp.md` for stage-gated upgrades (B test infra → C security → D data layer → E legal correctness → F decoupling → G perf → H UX → I observability → J devops → optional K Next.js).
