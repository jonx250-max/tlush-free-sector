# Threat Model — Tlush for the Free Sector

> **Scope.** This document covers the production-deployed application
> (React 18 SPA + Vercel Functions API + Supabase Postgres + Anthropic /
> Google Vision). It is reviewed at the end of each phase of the
> hardening plan and any time a new attacker scenario is identified.
>
> **Audience.** Engineers reviewing PRs that touch authentication,
> rate-limiting, OCR, audit logs, or any data flow that crosses a
> trust boundary.

## Trust boundaries

```
[browser] ──HTTPS──▶ [Vercel Functions /api/*] ──pg/HTTPS──▶ [Supabase]
   ▲                       │                                      │
   │                       └─HTTPS─▶ [Vision]    [Anthropic API]  │
   │                                                              │
   └────────── Vercel CDN ◀── static React SPA ─────── Vercel build ─┘
```

Trust degrades inward from the browser. The **only** identifiers we
trust on the server are values resolved from a verified Supabase JWT
(`auth.uid()` after `getUser()`), values added by Vercel's edge
infrastructure (`x-vercel-forwarded-for`), and values produced by the
server itself (request IDs, timestamps). Everything in the request body
or query string is attacker-controlled.

---

## Scenarios

### S1 — Free-tier abuse via VPN / UA rotation

**Actor.** A non-paying user wants unlimited free analyses.

**Path.** The free-tier uniqueness check derives a fingerprint from
`SHA256(pepper || ip || userAgent)`. A user can bypass uniqueness by
rotating IPs (consumer VPN) and forging User-Agent. Email-hash gate is
bypassed by signing up with a fresh inbox.

**Mitigations today.**
- IP + UA fingerprint blocks the most casual case (browser refresh).
- Free tier itself is capped at one analysis (so each bypass costs a
  new email + IP rotation).
- Beta lock + invite gate (`GEO_BYPASS_TOKENS` allow-list) currently
  caps the audience to known invitees.

**Residual risk.** Determined attackers can rotate freely. Acceptable
during closed beta because the OCR daily quota (S2) caps absolute cost.

**Future.** P5.b — switch fingerprint to HMAC and move pepper to a
dedicated `FREE_TIER_HMAC_SECRET` env. P6 — add IPQS / IPQualityScore
VPN-detection lookup to reject VPN/datacenter IPs at the perimeter.

---

### S2 — OCR cost exhaustion

**Actor.** Anyone who can reach `/api/ocr` (currently rate-limited at
5 req/min/IP, behind beta-lock geo-gate).

**Path.** Each real OCR call costs ~$0.01 (Vision + Claude). An attacker
can:
1. Spread requests across many IPs to evade per-IP rate-limit.
2. Submit valid-looking image base64 that Vision processes.

**Mitigations today.**
- Per-IP rate-limit (5/min) backed by Postgres `rate_limit_check` RPC
  (P1 migration `00009`). Survives Vercel cold starts; not bypassable
  by region rotation (single shared bucket per key).
- Global daily quota (`OCR_DAILY_LIMIT`, default 20/day) on real Vision
  calls — caps absolute cost per UTC day.
- Magic-byte validation (P1 `api/ocr.ts`) rejects non-image base64 with
  415 before counting toward quota.
- File-hash cache returns cached result for repeat uploads at $0.
- Geo-gate (`isGeoAllowed`) blocks non-IL traffic by default.

**Residual risk.** A determined attacker with many IPs could exhaust
the global daily quota. Cost is bounded ($0.20/day at default settings)
but availability degrades for legitimate users.

**Future.** Per-user quota (P1.b — needs `ocr_cache.user_id` column +
SPA auth-bearing OCR caller). Upstash Redis-backed distributed
rate-limit (P5.b) with sliding window across IP + user.

---

### S3 — Audit log tampering

**Actor.** Insider with database access (compromised service-role key,
malicious operator) attempting to remove or rewrite events.

**Path.** Modify or delete rows in `public.audit_log` to hide an
action.

**Mitigations today.**
- SHA-256 hash chain (P1 migration `00010`). Each row stores
  `hash = SHA256(prev_hash || user_id || action || case_id || payload || ts)`.
  Removing or editing any row breaks the chain at every subsequent row.
- `pg_advisory_xact_lock` on `hashtext(user_id)` serializes inserts per
  user — prevents the "two concurrent inserts share the same prev_hash"
  fork race.
- `FOR DELETE USING (false)` policy + `REVOKE DELETE` (P1 migration
  `00011`). Even RLS escapes can't remove rows via the public roles;
  service-role would have to deliberately bypass via direct DB access.
- Append-only invariant documented in this file.

**Residual risk.**
- Service-role key compromise allows full DB takeover; hash chain only
  helps detection, not prevention. Verifiable hash chain is valuable
  for forensic walk-back.
- No external Merkle anchor — chain integrity is verifiable only against
  the same DB. An attacker who can rewrite the entire chain coherently
  (re-compute every downstream hash) is undetectable. Mitigation
  requires periodic external attestation (out of current scope).

**Future.** Defer Merkle-tree audit ledger (over-engineering for current
scale). Consider periodic chain-tip publish to a write-once external
store (S3 Object Lock, OpenTimestamps) once usage justifies it.

---

### S4 — Admin spoof

**Actor.** A regular authenticated user who modifies the SPA to expose
admin UI, then calls admin endpoints directly.

**Path.** `src/components/AdminRoute.tsx` is a client-side gate reading
`profiles.is_admin`. A forged client (bypassed React route, replayed
fetch with own bearer token) reaches the admin endpoint without an
actual server-side admin check.

**Mitigations today.**
- No admin endpoints exist yet, so the surface is empty.
- `requireAdmin()` middleware (P5 `api/_lib/requireAdmin.ts`) is staged
  for the first admin endpoint. It re-resolves the JWT to a `user.id`,
  then re-queries `profiles.is_admin` server-side with the service-role
  key (bypassing RLS so the check is truthful).
- RLS on `profiles` restricts SELECT to `auth.uid() = id` (00008), so
  a regular user can't enumerate the admin set.

**Residual risk.** Once admin endpoints land, every one MUST call
`requireAdmin()`. Code review must enforce this; consider a Semgrep
rule that flags new files under `api/admin/**` lacking the import.

**Future.** Add Semgrep custom rule. Add `is_admin` audit-log event
(append on every promotion/demotion).

---

### S5 — PII at rest

**Actor.** Anyone with read access to the Supabase database (compromised
backup, leaked snapshot, dev-environment access by a contractor).

**Path.** Tables `contracts`, `payslips`, `analysis_runs`,
`demand_letters` store raw user PII as plaintext JSONB / text:
employee names, ID numbers, employer names, salary amounts, employment
dates.

**Mitigations today.**
- RLS on every user-data table restricts SELECT to `auth.uid() =
  user_id` (00008). Anon and authenticated roles cannot enumerate other
  users' rows.
- Supabase platform encrypts disk + backups at rest (provider
  guarantee, not application-level).
- Database access is service-role + project-owner only; production
  service-role key is stored in Vercel env vars (never committed).

**Residual risk.** A leaked service-role key or a compromised
project-owner account exposes everything. Application-level encryption
of sensitive fields would defeat both, at the cost of losing query-
ability.

**Future.** Defer pgsodium per-field encryption for ID numbers + salary
amounts. Needs a Supabase plan upgrade and a migration that re-encrypts
existing rows. Re-evaluate when paid users start submitting actual
payslips at scale.

---

## Out-of-scope (called out so they're not silently assumed)

- **DDoS at the network layer.** Vercel's edge handles L3/L4 but
  application-layer DDoS at OCR could deplete quota; see S2.
- **Phishing of users.** Out of scope; no special mitigation beyond
  HTTPS + clear branding.
- **Supply-chain compromise of npm dependencies.** Partially covered by
  CodeQL + Semgrep + npm audit + Dependabot in `.github/workflows/security.yml`.
  Gitleaks (P5) covers committed-secret leakage. SLSA-style provenance
  is out of scope.
- **Browser extension or local malware on the user's device.** Out of
  scope — we cannot defend against an attacker who already controls the
  user's browser.
- **Insider tampering with this threat model.** Reviews of this file
  itself should be part of every PR review checklist for security-
  sensitive changes.

---

## Review log

| Date | Phase / PR | Notes |
|---|---|---|
| 2026-04-28 | P5 (`p5-strategic-hardening`) | Initial document. Covers S1–S5 with mitigations from P1+P5 hardening waves. |
| 2026-05-02 | Stage C (this branch) | Added: C1 admin enforcement test (preventive, no admin endpoints yet); C3 central PII redactor wired into `logServerError`; C4 magic-byte format detection (rejects PDFs/EXEs disguised as images); C5 OCR text scrubber + strict Zod schema on Claude response; C6 per-user mutation rate-limit (`api/_lib/userRateLimit.ts`); C8 demo-auth refuses prod build; C9 CSRF doc explaining bearer-token immunity; C11 right-to-be-forgotten endpoint (`api/account/forget.ts`, hash-chain audit `ACCOUNT_PURGED`); C12 BotID activation note (code deferred until dashboard flip). Deferred: C2 strip CSP `unsafe-inline` (Stage G/H), C7 MFA UI (Stage H), C10 pgsodium per-column encryption (behind feature flag). |
