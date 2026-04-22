# Phase 2 — SPARC Redesign (Ruflo Architecture)

Date: 2026-04-21
Owner: Phase 1 audit backlog top 4 items
Scope: 4 slices (A–D), each independently shippable

---

## Design principles carried from ruflo-architecture

- Single responsibility per function; ≤ 20 lines
- 500-line file cap; split by domain
- Typed interfaces for all public APIs — no `any`
- Pure functions for calculators; side effects only at boundaries
- Tests already green → refactor under green-to-green (no behavior change)

---

## Slice A — `diffEngine.compare()` decomposition

### Current state
`src/services/diffEngine.ts` — 327L total. `compare()` body spans 45→200 (156L).
Internal structure is already 9 numbered comment-sections:

```
1. Base pay
2. Minimum wage check
3. Amendment 24 check
4. Commission analysis
5. Overtime analysis
6. Pension comparison
7. Keren Hishtalmut
8. Tax analysis
9. Benefits comparison
```

### Target architecture

```yaml
diffEngine_compare:
  type: "Pure orchestrator"
  responsibility: "Route inputs to 9 section analyzers, collect findings, build summary"
  body: ≤ 25 lines (calls + return)

section_analyzers:
  type: "Pure functions, one per rule domain"
  location: "src/services/diff/"
  files:
    - src/services/diff/basePaySection.ts      # analyzeBasePay()
    - src/services/diff/minimumWageSection.ts  # wraps existing validateMinimumWage
    - src/services/diff/amendment24Section.ts  # wraps existing validator
    - src/services/diff/commissionSection.ts   # wraps analyzeCommissions
    - src/services/diff/overtimeSection.ts     # wraps calculateOvertime + validateGlobalOvertime
    - src/services/diff/pensionSection.ts      # pension comparison
    - src/services/diff/kerenSection.ts        # Keren Hishtalmut
    - src/services/diff/taxSection.ts          # moves buildTaxAnalysis here
    - src/services/diff/benefitsSection.ts     # benefits comparison
  contract: |
    interface DiffSection {
      analyze(inputs: SectionInputs): AnalysisFinding[]
    }
    type SectionInputs = { contract, payslip, profile, year }
  each_file: ≤ 100 lines, each function ≤ 20 lines
```

### Public API unchanged
```ts
export function compare(contract, payslip, profile, year): DiffResult
```
All tests in `diffEngine.test.ts` pass without modification.

### Deliverables
- 9 new files under `src/services/diff/`
- `diffEngine.ts` shrinks to ~80L (imports + orchestrator + summary builder)
- Zero behavior change; verified by `diffEngine.test.ts` + `diffEngine.realWorld.test.ts` staying green

### Build sequence
1. Extract sections 1, 6, 7, 9 (pure, no existing helpers) — 4 commits
2. Extract sections 2–5 (wrap existing validators) — 4 commits
3. Extract section 8 (move `buildTaxAnalysis`) — 1 commit
4. Shrink orchestrator — 1 commit

---

## Slice B — `taxCalculator.calculateCreditPoints()` decomposition

### Current state
`src/services/taxCalculator.ts` — 324L; `calculateCreditPoints()` is 93L single function.

### Target architecture

```yaml
calculate_credit_points:
  type: "Pure orchestrator"
  location: src/services/tax/creditPoints.ts
  body: ≤ 25 lines
  returns: { total: number, breakdown: CreditPointBreakdown[] }

credit_point_rules:
  type: "Rule functions, one per category"
  location: src/services/tax/credits/
  files:
    - baseResident.ts       # 2.25 default + gender adjustment
    - children.ts           # per-child credit by age bracket
    - newImmigrant.ts       # immigration bonus
    - singleParent.ts
    - disability.ts
    - military.ts           # service years + combat bonus
    - academicDegree.ts     # BA/MA/PhD credits
    - reservist.ts          # 2026-specific reservistDays
  contract: |
    type CreditRule = (profile: CreditPointsInput, year: number) => CreditContribution
    type CreditContribution = { points: number, reason: string }
  each_function: ≤ 20 lines
```

### Migration
- `taxCalculator.ts` re-exports `calculateCreditPoints` from `./tax/creditPoints` — external API preserved
- All `taxCalculator.test.ts` cases continue to pass

---

## Slice C — `round` / `round2` consolidation

### Current state
7 service files each define their own `round2()`. God node in graphify (28 edges). DRY violation, potential drift.

### Target architecture

```yaml
numbers_utility:
  type: "Shared utility module"
  location: src/lib/numbers.ts
  exports:
    - round2(n: number): number              # 2-decimal rounding
    - round0(n: number): number              # integer rounding
    - clamp(n: number, lo: number, hi: number): number
    - percent(numerator: number, denom: number): number
  tests: src/lib/numbers.test.ts — property-based with fast-check
```

### Migration
- Add `src/lib/numbers.ts` + tests
- Replace each inline `round2` with `import { round2 } from '../lib/numbers'`
- 7 files, ~1 line each; mechanical refactor
- Run full test suite after each file edit

### Payoff
- Graphify god-node degree for `round2` drops; cross-community bridge noise reduced
- Single source of truth for rounding semantics
- Prepares surface for future IEEE-754 edge-case tests

---

## Slice D — RLS perf migration (DB)

### Current state (from Phase 1 RLS audit)
- 14+ policies call `auth.uid()` unwrapped → re-evaluated per row
- 4 tables have overlapping permissive SELECT policies (Admin + Authenticated)
- 2 unindexed FKs: `salary_rule_releases.created_by`, `salary_rule_runtime_state.current_release_id`
- `public.set_updated_at` function has mutable `search_path`
- Leaked-password-protection disabled (Auth setting, UI-only change)

### Target migration

```sql
-- supabase/migrations/20260421_rls_perf_hardening.sql

-- 1. Wrap auth.uid() in (select auth.uid()) across all policies
-- Pattern: DROP POLICY + CREATE POLICY with wrapped call
-- 17 policies total (4 profiles, 4 analysis_runs, 3 analysis_findings, 4 admin, 2 misc)

DROP POLICY "Users can view own profile." ON public.profiles;
CREATE POLICY "Users can view own profile." ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));
-- (repeat pattern for insert/update/delete and all other tables)

-- 2. Merge overlapping permissive SELECT policies
--    Replace {Admin can manage X, Authenticated read X} with a single
--    policy: `USING (true)` for SELECT, since Admin-manage already allows all.
DROP POLICY "Authenticated read salary_rules" ON public.salary_rules;
-- (Admin can manage ... already covers SELECT for all authenticated)

-- 3. Add FK indexes
CREATE INDEX idx_salary_rule_releases_created_by
  ON public.salary_rule_releases(created_by);
CREATE INDEX idx_salary_rule_runtime_state_current_release_id
  ON public.salary_rule_runtime_state(current_release_id);

-- 4. Fix set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''     -- harden against search_path attacks
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### Manual (not in migration)
- Enable leaked-password-protection: Supabase dashboard → Auth → Policies → toggle on

### Deliverables
- One migration file applied via `mcp__supabase__apply_migration`
- Re-run `get_advisors` — expect all `auth_rls_initplan` and `multiple_permissive_policies` WARNs cleared
- Unused-index INFOs may remain (empty tables — defer until rows exist)

---

## Cross-slice build sequence

```
Slice D (DB migration)        ← first; lowest code risk, highest security value
  └─ verify advisors clean

Slice C (round2 consolidation) ← trivial, all-mechanical
  └─ full test suite green

Slice B (tax credit points)    ← medium complexity, one file
  └─ taxCalculator tests green

Slice A (diffEngine split)     ← largest; 9 sub-files
  └─ diffEngine + realWorld tests green
  └─ run /graphify . --update to see god-node degree drop
```

Each slice: branch → PR → review → merge → next slice.

---

## Out of scope for Phase 2

- React page splits (LandingPage 335L, UploadPage 173L, OnboardingWizard 151L) — deferred to Phase 4
- `demandLetterGenerator.generateDemandLetter` 128L — deferred
- Bundle/perf work post-refactor
- Web Vitals measurement

These become Phase 4 slices after Phase 2 lands clean.

---

## Success criteria for Phase 2 completion

1. All 4 slices merged to main
2. `npm test` = 181+ tests green
3. `npm run build` = clean, no bundle regression > 5KB gz
4. `graphify` regen: `round2` no longer a god node; `compare()` no longer a bridge (its sections take its place)
5. Supabase `get_advisors` security + performance: only unused-index INFOs remain
6. No behavior changes visible to end users
