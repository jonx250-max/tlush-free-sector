# TLUSH Free Sector — Phase 1 Audit Report

Generated: 2026-04-21 · Last updated: 2026-04-25 · Branch: main

---

## Executive summary

**Phase 1 closed.** All 13 ranked backlog items resolved (12 ✅ DONE in code, 1 dashboard-only manual toggle remaining). Tests 237/237 green. tsc clean. Lint 0 errors. Supabase RLS perf + security advisors clean. Web Vitals reporter live. Supabase-native error tracking live.

Three god-node refactors completed: `diffEngine.compare`, `taxCalculator.calculateCreditPoints`, `demandLetterGenerator.generateDemandLetter`. Page splits done. Codebase ready for Phase 2 SPARC.

---

## Phase 1 findings

### 1. Tests — PASS
- 21 test files, 181 tests, 0 failures
- Duration: 468ms (fast — property-based calculators dominate)
- Coverage: every calculator engine has a companion `*.test.ts`

### 2. Build — PASS
- `vite build` clean in 633ms
- Code-split verified; lazy chunks: `pdf` 405KB (121KB gz), `auth` 190KB (50KB gz), `index` 144KB (47KB gz)
- Per-page chunks: OnboardingWizard 28.8KB, ResultsPage 21KB — good

### 3. Ruflo caps
- File cap 500L: **OK** — max 468L (`OnboardingWizard.tsx`), then `contractParser.ts` 449L, `LandingPage.tsx` 418L, `payslipParser.ts` 396L, `ResultsPage.tsx` 395L
- Function cap 20L: **40 violations** (inflated by React page fns). Real service violations:
  - `diffEngine.compare()` — 156L **← HIGH**
  - `demandLetterGenerator.generateDemandLetter()` — 128L
  - `taxCalculator.calculateCreditPoints()` — 93L **← HIGH**
  - `contractParser.parseContractText()` — partially refactored already (1a88a0f)
  - React pages (LandingPage 335L, UploadPage 173L, OnboardingWizard 151L, ToolsPage 136L) — split into sub-components

### 4. Security — npm audit: 0 vulns; RLS hardened; perf clean
- Auth path has a catch handler on `getSession` (de6b277) — good
- **DB ACTIVE_HEALTHY.** 8 tables, all RLS enabled: `profiles`, `salary_rules`, `salary_rule_releases`, `salary_rule_release_items`, `salary_rule_runtime_state`, `analysis_runs`, `analysis_findings`, `error_logs`. Zero rows currently.
- **Security WARNs (1 remaining, dashboard-only):**
  - ~~`public.set_updated_at` mutable `search_path`~~ — **fixed** in migration `20260421105222 rls_perf_hardening`
  - Leaked-password-protection disabled — enable in Supabase Auth settings (manual dashboard toggle, see "Manual user actions" section)
- **Performance WARNs:** **all cleared** in migration `20260421105222`
  - ~~14+ bare `auth.uid()`~~ → wrapped in `(select auth.uid())`
  - ~~4 overlapping permissive SELECT policies~~ → consolidated
  - ~~2 unindexed FKs~~ → indexed
  - 7 INFO unused indexes (expected for empty tables — defer)
- **error_logs RLS:** insert-only for `anon`/`authenticated` with `(user_id is null or user_id = (select auth.uid()))` — write-only client pattern, zero exfiltration risk

### 5. Bundle / perf baseline
- Total JS ≈ 1.1MB raw, ≈ 330KB gz
- PDF parser 37% of bundle — acceptable since lazy-loaded on upload
- No obvious low-hanging tree-shake wins
- Web Vitals: **reporter wired** in `src/lib/webVitals.ts` (CLS/INP/LCP/FCP/TTFB). Set `VITE_WEB_VITALS_ENDPOINT` to POST; falls back to console.

### 6. Knowledge graph (graphify)
- 343 nodes, 436 edges, 78 communities (AST-only weekly update — 0 LLM tokens)
- God nodes (top 5): `round` (28 edges), `field` (18), `runMasterDiagnosis` (12), `parsePayslipPdf` (11), `compare` (10)
- Cross-community bridges: `extractText` (Parser↔Diff), `extractStructured` (Template↔Diff)
- 33 weakly-connected nodes — documentation / missing-edge signal

---

## Critical

**🟢 RESOLVED — Supabase resumed** (ACTIVE_HEALTHY at 2026-04-21). RLS audit completed above.

---

## Ranked backlog (severity × payoff)

| # | Severity | Item | Why | Payoff |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Resume Supabase project | App broken in prod | Unblocks everything |
| 2 | 🟠 HIGH | RLS policy audit (run get_advisors after resume) | Security | Catch security gaps |
| 3 | 🟠 HIGH | Refactor `diffEngine.compare` (156L → ≤20L per fn) | God node, high blast radius, test-covered | Safe to refactor |
| 4 | 🟠 HIGH | Refactor `taxCalculator.calculateCreditPoints` (93L) | Core tax logic, test-covered | Correctness |
| 5 | 🟠 HIGH | Consolidate `round` / `round2` duplication across calculators | God node (28 edges) indicates duplication pain | Single source of truth |
| 6 | 🟡 MED | Split `LandingPage.tsx` 335L component into sub-components | Readability, perf | Smaller bundle per page |
| 7 | 🟡 MED | Split `UploadPage.tsx` 173L + `OnboardingWizard` 151L funcs | Readability | Easier testing |
| 8 | ✅ DONE | Refactor `demandLetterGenerator.generateDemandLetter` 128L | `d047a4a` — template + findingsTable + amendment24Section + escapeHtml |
| 9 | ✅ DONE | Measure Web Vitals post-Supabase-resume | `src/lib/webVitals.ts` wired in `main.tsx` — set `VITE_WEB_VITALS_ENDPOINT` to POST; falls back to console |
| 10 | ✅ DONE | Add `useAnalysis` hook test coverage | `25f70c8` — analysisReadiness guard extracted + store tests |
| 11 | ✅ DONE | Investigate weakly-connected graph nodes | `92a4dc4` — knip scan: 3 dead files removed, recharts dropped, 4 helpers + 8 exports pruned |
| 12 | ✅ DONE | PDF worker lazy-init audit (405KB chunk) | `/upload` is `lazy()` in `App.tsx` → pdf chunk downloads only on upload route. Pre-loading there is desirable. No action. |
| 13 | ✅ DONE | Supabase-native error tracking | `error_logs` table + RLS (insert-only) + `reportError()` lib + ErrorBoundary + window/unhandledrejection handlers wired in `main.tsx` |

---

## Next phase

Phase 1 (audit) closed. **Phase 2 — Talush Integration** active.

### Phase 2: Talush Integration (started 2026-04-25)

**Plan**: `C:/Users/jonx2/.claude/plans/unified-snacking-sedgewick.md` (~200h scope, 11 sub-phases P0-P11)

**Goal**: Integrate `FREE TLUSH.zip` design+logic package (13 HTML pages + 9 JS modules + 10 laws + auto-update pipeline + security policy + GitHub Action) into existing Vite+React+TS+Supabase project. Preserve 100% of ZIP logic. Ship perfect desktop+mobile UX.

**Locked decisions**:
- Stack: stay on Vite (skip Next.js migration — saves 80h, preserves 237 tests + CI)
- Pricing: **one-time per-payslip** (Basic ₪8 / Pro ₪10 / Premium ₪14, with 0/10/17/25% volume discount on 1/3/6/12 months)
- Letter generation: Premium-only
- Rights center: 18 in Pro, 60+ in Premium, with 4-layer legal-defensive design
- Pattern Detection: 3+ consecutive months trigger, Pro+ gate
- Maya/Business tier: SKIPPED for MVP
- Notarization: OpenTimestamps (free Bitcoin anchor)
- Payments: Tranzila deferred to Phase 8 (after MVP validation)
- Privacy: hybrid client+server (encryption-at-rest, RLS), NOT pure-client
- Brand: `freemarket.tlush.co.il`
- Admin: `jonx250@gmail.com` only

**P0 status (in progress)**: branch `chore/talush-prep` created, taste-skill + awesome-claude-code cloned to `~/.claude/skills/`, ZIP contamination moved to `talush-package/` (gitignored), auth + deps audit done.

**Sub-phases**:
- P0 Pre-flight (4h) — current
- P1 Tailwind+i18n+a11y (8h)
- P2 Auth+RBAC+Profile (10h)
- P3 DB schema+audit log+notarization (12h)
- P4 9 missing calculators (28h)
- P5 Pricing matrix+free-tier guard (12h)
- P6 13 UI pages (40h)
- P7 Auto-update pipeline+admin/audit (16h)
- P8 Security middleware (14h)
- P9 OCR+AI bot+heic (12h)
- P10 Tranzila payments (10h, deferred)
- P11 Production go-live + T1-T7 test matrix (16h)

**Total**: ~158-200h realistic, 6.7 calendar weeks at 30h/week solo.

---

## Manual user actions (cannot automate via MCP)

### Supabase: enable leaked-password protection
- **What:** Auth setting "Leaked password protection" (HIBP check on signup/signin)
- **Why manual:** Supabase MCP exposes SQL, migrations, advisors — no `auth-config` endpoint. Toggle lives behind Dashboard UI / Management API only.
- **Steps:**
  1. Open https://supabase.com/dashboard/project/_/auth/providers
  2. Under **Email** provider → enable "Leaked password protection"
  3. Re-run `get_advisors` → WARN should clear
- **Impact:** Closes the second security WARN from Phase 1.5.

### ✅ Supabase: `public.set_updated_at` search_path — DONE
Applied in migration `20260421105222 rls_perf_hardening`.
