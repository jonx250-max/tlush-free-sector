# ADR 0002 — Supabase RLS-only authorization (no per-column encryption yet)

- Status: Accepted
- Date: 2026-04-29
- Supersedes: —
- Superseded by: —

## Context

User payslips and contracts contain sensitive PII: Israeli ID numbers (תעודת זהות), bank accounts, salaries, addresses. Threat-model scenario S5 (`data/security/threat-model.md`) discusses three options:

1. **RLS-only** — `auth.uid() = user_id` on every user-data table; rely on Supabase disk encryption at rest.
2. **pgsodium per-column** — `crypto_aead_det_encrypt` on the most sensitive columns (ID number, bank).
3. **Application-level envelope encryption** — encrypt JSON blobs in the Function before INSERT, decrypt on read.

Trade-offs:
- pgsodium needs verified Supabase plan support and adds operational complexity (key rotation, search via deterministic encryption only).
- Application-level encryption breaks RLS-aware joins and Postgres full-text search.
- RLS-only is simple and well-tested but exposes plaintext to anyone with service-role access.

## Decision

Adopt **RLS-only** for now (option 1). Defer pgsodium per-column encryption (option 2) behind a feature flag (`pgsodium_pii_encryption`) — see ULTRAPLAN Stage C item C10.

## Consequences

### Positive
- One mental model for reads: RLS enforces ownership, the same way for every table.
- No key-management overhead in the application layer.
- Supabase disk encryption + RLS satisfies Israeli Privacy Protection Law minimum.
- Generated TS types stay 1:1 with the DB schema (Stage D).

### Negative
- Service-role compromise (or a misconfigured admin endpoint) sees plaintext PII.
- Backups contain plaintext; we depend on Supabase backup encryption.
- Audit-log payloads may contain PII unless redactPII() (Stage C item C3) wraps every write.

### Mitigations
- `requireAdmin()` middleware (already shipped) re-checks `is_admin` server-side on every admin call.
- Admin endpoints will fail CI if not gated (Stage C item C1 enforcement test).
- Stage C item C3 adds central PII redaction to all logs and Claude inputs.
- Stage C item C10 stages the pgsodium upgrade so we can flip the flag once Supabase plan + key-rotation runbook are confirmed.
