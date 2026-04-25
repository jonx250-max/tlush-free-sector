# TLUSH Free Sector — Phase 1 Audit Report

Generated: 2026-04-21 · Branch: main · HEAD: 1a88a0f

---

## Executive summary

Codebase healthy. Tests green. File caps respected. Zero npm vulns.
**One critical blocker: Supabase project is paused.** Fix first.
After that, three high-value refactors on god nodes (`compare`, `calculateCreditPoints`, `parseContractText`) unlock clean Phase 2 SPARC work.

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

### 4. Security — npm audit: 0 vulns; RLS good, perf needs tuning
- Auth path has a catch handler on `getSession` (de6b277) — good
- **DB resumed ACTIVE_HEALTHY.** 7 tables, all RLS enabled: `profiles`, `salary_rules`, `salary_rule_releases`, `salary_rule_release_items`, `salary_rule_runtime_state`, `analysis_runs`, `analysis_findings`. Zero rows currently.
- **Security WARNs (2):**
  - `public.set_updated_at` function has mutable `search_path` — fixable by setting `SET search_path = ''` in function def
  - Leaked-password-protection disabled — enable in Supabase Auth settings
- **Performance WARNs:**
  - 14+ RLS policies use bare `auth.uid()` instead of `(select auth.uid())` — per-row re-evaluation at scale
  - 4 tables have overlapping permissive SELECT policies for `authenticated` role (Admin + Authenticated read)
  - 2 unindexed FKs: `salary_rule_releases.created_by`, `salary_rule_runtime_state.current_release_id`
  - 3 unused indexes (expected for empty tables — defer)
- **Fix path:** single migration consolidates all policy/index fixes

### 5. Bundle / perf baseline
- Total JS ≈ 1.1MB raw, ≈ 330KB gz
- PDF parser 37% of bundle — acceptable since lazy-loaded on upload
- No obvious low-hanging tree-shake wins
- Web Vitals: **not yet measured on production** (Supabase paused — cannot reach app)

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

Phase 2 = ruflo-architecture SPARC redesign against this backlog.
Phase 3 = writing-plans → per-slice implementation.
Phase 4 slices: A (diffEngine refactor) → B (tax refactor) → C (round consolidation) → D (page splits).

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

### Supabase: fix `public.set_updated_at` mutable search_path
- **What:** Function search_path hardening
- **Why manual:** Requires migration PR approval (low priority, DB empty)
- **Fix:**
  ```sql
  ALTER FUNCTION public.set_updated_at() SET search_path = '';
  ```
  Apply via `mcp__supabase__apply_migration` when ready.
